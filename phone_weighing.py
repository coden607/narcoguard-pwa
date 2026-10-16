from phone_calibrator import calibrate

def weigh(phone_number: str) -> dict:
    """Return a dict with confidence and a simple weight metric."""
    confidence = calibrate(phone_number)
    weight = confidence * 100
    return {"phone": phone_number, "confidence": confidence, "weight": weight}
