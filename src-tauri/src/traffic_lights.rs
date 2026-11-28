//! Where the macOS traffic lights sit, placed by BibleLM rather than by tao.
//! Ported from Nexis (nexis-design APP-FINDINGS, Nexis #1).
//!
//! The window uses the overlay title bar, so the native close, minimise and
//! zoom buttons float over our own title bar and have to be moved to its
//! centre. The webview measures the bar (src/app/titleBar.ts) and asks.
//!
//! Tauri's own `trafficLightPosition` cannot be used: tao re-applies it on
//! every `drawRect:`, fullscreen included, and positions the button
//! container against the *window's* height. In native fullscreen the buttons
//! live in the separate strip macOS reveals at the top of the screen, so
//! that formula pushes them out of it: the reveal shows no buttons, and with
//! no title bar to double-click there was no visible way out of fullscreen.
//! tao offers no way to clear a position once set.
//!
//! So each window asks for its position once (`window_traffic_lights`), and
//! we re-apply it on the window events after which AppKit lays the title bar
//! out again (resize, focus, theme and scale changes, leaving fullscreen
//! arrives as a resize), measuring against the container's own superview,
//! and never while the window is fullscreen, where AppKit's layout is left
//! alone. Off macOS this is a no-op.

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{Runtime, Window, WindowEvent};

/// Requested position per window label: `x` is the close button's left
/// edge, `y` the buttons' vertical centre, both in points.
#[derive(Default)]
pub struct TrafficLights(Mutex<HashMap<String, (f64, f64)>>);

impl TrafficLights {
    fn get(&self, label: &str) -> Option<(f64, f64)> {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .get(label)
            .copied()
    }

    fn set(&self, label: &str, pos: (f64, f64)) {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(label.to_string(), pos);
    }

    fn forget(&self, label: &str) {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(label);
    }
}

/// Place the calling window's traffic lights, and keep them there.
#[tauri::command]
pub fn window_traffic_lights<R: Runtime>(
    window: Window<R>,
    state: tauri::State<'_, TrafficLights>,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if !(x.is_finite() && y.is_finite())
        || !(0.0..=200.0).contains(&x)
        || !(0.0..=200.0).contains(&y)
    {
        return Err("traffic light position out of range".into());
    }
    state.set(window.label(), (x, y));
    apply(&window, (x, y));
    Ok(())
}

/// Re-apply after the events that make AppKit lay the title bar out again.
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    use tauri::Manager;
    let Some(state) = window.try_state::<TrafficLights>() else {
        return;
    };
    match event {
        WindowEvent::Destroyed => state.forget(window.label()),
        WindowEvent::Resized(_)
        | WindowEvent::Focused(_)
        | WindowEvent::ScaleFactorChanged { .. }
        | WindowEvent::ThemeChanged(_) => {
            if let Some(pos) = state.get(window.label()) {
                apply(window, pos);
            }
        }
        _ => {}
    }
}

#[cfg(target_os = "macos")]
fn apply<R: Runtime>(window: &Window<R>, (x, y): (f64, f64)) {
    let w = window.clone();
    let _ = window.run_on_main_thread(move || {
        // In fullscreen the buttons belong to the reveal strip; AppKit's own
        // layout is the right one there.
        if w.is_fullscreen().unwrap_or(false) {
            return;
        }
        let Ok(ptr) = w.ns_window() else { return };
        if ptr.is_null() {
            return;
        }
        // SAFETY: `ns_window` is the live NSWindow of `w`, and this closure
        // runs on the main thread, where AppKit objects may be touched.
        let ns: &objc2_app_kit::NSWindow = unsafe { &*(ptr as *const objc2_app_kit::NSWindow) };
        place(ns, x, y);
    });
}

#[cfg(not(target_os = "macos"))]
fn apply<R: Runtime>(_window: &Window<R>, _pos: (f64, f64)) {}

/// The same arithmetic tao uses, measured against the container's parent
/// rather than the window, so it can never land outside it.
#[cfg(target_os = "macos")]
fn place(ns: &objc2_app_kit::NSWindow, x: f64, y: f64) {
    use objc2_app_kit::NSWindowButton;
    let (Some(close), Some(mini), Some(zoom)) = (
        ns.standardWindowButton(NSWindowButton::CloseButton),
        ns.standardWindowButton(NSWindowButton::MiniaturizeButton),
        ns.standardWindowButton(NSWindowButton::ZoomButton),
    ) else {
        return;
    };
    // SAFETY: `superview` is unsafe in objc2 only because a view's parent
    // may be mutated concurrently; this runs on the main thread, which owns
    // the view hierarchy, and each step is checked for nil.
    let Some(container) = (unsafe { close.superview() }).and_then(|v| unsafe { v.superview() })
    else {
        return;
    };
    let Some(parent) = (unsafe { container.superview() }) else {
        return;
    };
    let close_rect = close.frame();
    let height = close_rect.size.height + y;
    let mut rect = container.frame();
    rect.size.height = height;
    rect.origin.y = parent.frame().size.height - height;
    container.setFrame(rect);

    // Where AppKit leaves the buttons inside that container depends on the
    // macOS version (14pt buttons sat 7pt above its bottom, 16pt ones sit
    // 10pt above), so `y` alone does not land their centre on `y`. Measure
    // the close button's centre in window coordinates and move every button
    // vertically by the difference.
    // Window base coordinates have their origin at the bottom left, always.
    let window_height = ns.frame().size.height;
    let dy = match unsafe { close.superview() } {
        Some(row) => {
            let r = row.convertRect_toView(close.frame(), None);
            let centre_from_top = window_height - (r.origin.y + r.size.height / 2.0);
            let off = centre_from_top - y;
            if row.isFlipped() {
                -off
            } else {
                off
            }
        }
        None => 0.0,
    };

    let space = mini.frame().origin.x - close_rect.origin.x;
    for (i, button) in [close, mini, zoom].iter().enumerate() {
        let mut origin = button.frame().origin;
        origin.x = x + i as f64 * space;
        origin.y += dy;
        button.setFrameOrigin(origin);
    }
}
