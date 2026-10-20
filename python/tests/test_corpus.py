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
