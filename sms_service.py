import logging

logging.basicConfig(level=logging.INFO)

def send_sms(to: str, body: str):
    logging.info(f"SMS to {to}: {body}")
    # Placeholder: no real SMS sending
