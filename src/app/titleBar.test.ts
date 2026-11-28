import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { trafficLightY } from "./titleBar";

describe("traffic lights", () => {
  it("centre on the bar: y is half its height", () => {
    expect(trafficLightY(48)).toBe(24);
    expect(trafficLightY(60)).toBe(30);
  });

  // tao re-applies trafficLightPosition in native fullscreen and pushes the
  // buttons out of the reveal strip: no visible way out (src-tauri/src/traffic_lights.rs).
  it("are never placed with Tauri's trafficLightPosition", () => {
    const conf = readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8");
    expect(conf).not.toMatch(/trafficLightPosition/i);
  });
});
