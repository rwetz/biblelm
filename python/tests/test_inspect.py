import pytest

torch = pytest.importorskip("torch")

from biblelm.inspect_model import lens  # noqa: E402
from biblelm.model import GPTConfig, GPTMini  # noqa: E402
from biblelm.tokenizer import CharTokenizer  # noqa: E402


def test_lens_shapes_match_the_model():
    tok = CharTokenizer.from_text("in the beginning god created\n")
    model = GPTMini(GPTConfig(vocab_size=tok.vocab_size, context_len=32, d_model=16, n_layers=2, n_heads=2)).eval()
    out = lens(model, tok, "in the beginning")
    T = len("in the beginning")
    assert out["layers"] == 2 and out["heads"] == 2
    assert len(out["attention"]) == 2 and len(out["attention"][0]) == 2
    assert len(out["attention"][0][0]) == T
    # causal: a position never attends to the future, and each row sums to 1
    row = out["attention"][1][0][3]
    assert all(p == 0 for p in row[4:])
    assert abs(sum(row) - 1) < 0.02
    assert len(out["lens"][0]) == T and len(out["lens"][0][0]) == 3
    assert out["loss"][0] is None and len(out["loss"]) == T
