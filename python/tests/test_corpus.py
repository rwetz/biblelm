from biblelm import corpus


def test_gutenberg_book_page_rewritten_to_txt():
    assert (
        corpus.normalize_url("https://www.gutenberg.org/ebooks/10")
        == "https://www.gutenberg.org/cache/epub/10/pg10.txt"
    )


def test_other_urls_pass_through():
    url = "https://example.org/bible.txt"
    assert corpus.normalize_url(url) == url


def test_html_is_detected():
    assert corpus.looks_like_html("<!DOCTYPE html><html><body>hi</body></html>")
    assert not corpus.looks_like_html("1:1 In the beginning God created the heaven and the earth.")


def test_carriage_returns_are_not_tokens():
    assert corpus.normalize_newlines("a\r\nb\rc\n") == "a\nb\nc\n"


def test_clean_strips_boilerplate_and_crlf():
    raw = (
        "License junk\r\n"
        "*** START OF THE PROJECT GUTENBERG EBOOK THE BIBLE ***\r\n"
        "1:1 In the beginning\r\n"
        "*** END OF THE PROJECT GUTENBERG EBOOK THE BIBLE ***\r\n"
        "More license junk\r\n"
    ).encode()
    text = corpus.clean(raw)
    assert "\r" not in text
    assert "junk" not in text
    assert "1:1 In the beginning" in text


def test_alphabet_counts_every_symbol_commonest_first(tmp_path):
    corpus.corpus_path(tmp_path, "t").write_text("aab\nb a", encoding="utf-8")
    assert corpus.alphabet(tmp_path, "t") == [["a", 3], ["b", 2], ["\n", 1], [" ", 1]]


def test_goetia_spirits_keeps_the_catalogue_only():
    lines = ["Preface and the rest.", ""]
    for n in range(1, 73):
        lines += [f"({n}.) NAME{n}.—The Spirit number {n} is a Duke.[{n}] He ruleth", "over 30 Legions.", ""]
        if n == 3:
            lines += ["[Transcriber’s Note: seals.]", ""]
    lines += ["THESE be the 72 Mighty Kings.", "", "THE MAGICAL CIRCLE.", "The rite."]
    text = corpus.goetia_spirits("\n".join(lines))
    paras = text.strip().split("\n\n")
    assert len(paras) == 72
    assert paras[0] == "The Spirit number 1 is a Duke. He ruleth over 30 Legions."
    assert "Transcriber" not in text and "CIRCLE" not in text and "rite" not in text and "Preface" not in text


def test_goetia_spirits_refuses_a_short_catalogue():
    import pytest

    with pytest.raises(ValueError):
        corpus.goetia_spirits("(1.) BAEL.—One.\n\nTHESE be the 72")
