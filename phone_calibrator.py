def calibrate(phone_number: str) -> float:
    """
    Return a confidence score (0.0-1.0) indicating how likely the number is correctly formatted.
    Simple heuristic based on length and digit composition.
    """
    digits = [c for c in phone_number if c.isdigit()]
    # Assume typical max length of 15 digits (E.164)
    score = len(digits) / 15.0
    return max(0.0, min(score, 1.0))
