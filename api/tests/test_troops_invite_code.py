"""Tests for troop invite code generation."""

from app.routers.troops import _generate_invite_code


def test_generate_invite_code_has_prefix_and_8_hex_randomness():
    code = _generate_invite_code()

    assert code.startswith("TROOP-")
    random_part = code[len("TROOP-"):]
    assert len(random_part) >= 8
    assert all(char in "0123456789ABCDEF" for char in random_part)
