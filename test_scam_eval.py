import asyncio
import sys
import json

from backend.ai.scam_detector import analyze_scam

test_messages = [
    ("Bank KYC Alert", "Dear Customer, Your SBI account is BLOCKED! Complete KYC immediately or account will be permanently suspended. Click here: http://sbi-kyc-verify.tk/update and enter your details to avoid legal action. Urgent response required within 24 hours. - SBI Bank Team"),
    ("Job Offer Scam", "Congratulations! You have been selected for a Work From Home opportunity. Earn Rs 25,000 per week doing simple data entry tasks. Registration fee only Rs 999. Send money to UPI: fraudster@ybl to activate your account. Call HR: +91 99999 00000"),
    ("Digital Arrest Threat", "This is CBI Officer Rajesh Kumar speaking. Your Aadhaar number has been linked to a money laundering case. An arrest warrant has been issued in your name. To avoid immediate arrest, transfer Rs 50,000 to our secure account for investigation purposes. This is your final warning."),
    ("Lottery Win", "CONGRATULATIONS! You have won Rs 45,00,000 in the KBC Lucky Draw! To claim your prize, send processing fee of Rs 2,500 to our agent. Contact: lucky.prize2024@gmail.com. Offer valid for 48 hours only!"),
    ("Emergency Impersonation", "Hi Mom, I lost my phone and this is my new temporary number. Please send me $500 via CashApp to pay for the emergency clinic visit right now!"),
    ("Parcel Delivery Phishing", "Your package could not be delivered due to an incorrect address. Please click https://postal-service-update.top/track to update your shipping address and pay $1.99 redelivery fee."),
    ("Legitimate Meeting", "Hey Sarah, are we still meeting for lunch at 1 PM today at the downtown cafe? Let me know if you are running late!"),
    ("Legitimate Appointment", "Your appointment with Dr. Sharma has been confirmed for tomorrow at 10:30 AM at Metro Hospital. Please arrive 15 minutes early.")
]

async def main():
    print("=" * 70)
    print("EVALUATING SCAM DETECTION ON 8 TEST MESSAGES")
    print("=" * 70)
    for i, (name, msg) in enumerate(test_messages, 1):
        res = await analyze_scam(msg)
        verdict = res.get("verdict")
        score = res.get("risk_score")
        cat = res.get("category")
        ind = res.get("indicators", [])
        exp = res.get("explanation", "")
        mode = res.get("mode", "")
        print(f"[{i}/8] {name}: {verdict} (Risk Score: {score}/100, Cat: {cat}, Mode: {mode})")
        print(f"    Indicators ({len(ind)}): {', '.join(ind) if ind else 'None'}")
        print(f"    Explanation: {exp}")
        print("-" * 70)

if __name__ == "__main__":
    asyncio.run(main())
