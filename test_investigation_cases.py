import asyncio
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

from backend.ai.investigator import analyze_investigation

cases = [
    {
        "name": "Homicide Case - Apartment 4B",
        "description": "Victim discovered deceased in living room.",
        "entities": "Vikram Malhotra, +91 98765 43210, Red Toyota Corolla, Skyline Apartments, 09:15 PM",
        "evidence": "Kitchen knife recovered near sink. Fingerprints matched to Vikram Malhotra. CCTV footage from lobby shows Red Toyota Corolla departing Skyline Apartments at 09:15 PM. SMS from +91 98765 43210 sent 2 hours before incident stating 'You will regret this'.",
        "notes": "Witness Sunita stated she saw Vikram leaving the hallway in a hurry around 09:10 PM."
    },
    {
        "name": "Corporate Burglary - TechCorp HQ",
        "description": "Break-in reported at R&D server room.",
        "entities": "Marcus Vance, Blue Delivery Van, 45 Industrial Road, 03:15 AM",
        "evidence": "Badge scan used at 03:15 AM belonged to former contractor Marcus Vance. Pawn shop receipt found for stolen hardware. CCTV confirms Blue Delivery Van parked outside 45 Industrial Road.",
        "notes": "Guard reported back door lock had been tampered with."
    },
    {
        "name": "Digital Arrest Extortion Scheme",
        "description": "Complainant extorted for funds under fake CBI arrest pretext.",
        "entities": "Officer Ajay Singh, CBI, +91 91234 56789, official@cbi-investigation.in, payment@okaxis, Rs 2,50,000",
        "evidence": "WhatsApp call received from +91 91234 56789. Fake warrant document sent from official@cbi-investigation.in demanding immediate transfer of Rs 2,50,000 to payment@okaxis.",
        "notes": "Victim transferred initial Rs 50,000 before contacting actual police helpline."
    },
    {
        "name": "Sparse Case - Missing Bicycle",
        "description": "Bicycle missing from garden.",
        "entities": "",
        "evidence": "Bicycle was parked near porch.",
        "notes": "No suspect or witness."
    }
]

async def main():
    for idx, case in enumerate(cases, 1):
        print(f"=== CASE {idx}: {case['name']} ===")
        res = await analyze_investigation(case)
        print("Summary:", res.get("summary"))
        print("Risk level:", res.get("risk_level"))
        print(f"Key Findings ({len(res.get('key_findings', []))}):", res.get("key_findings"))
        print(f"Relationships ({len(res.get('relationships', []))}):")
        for r in res.get("relationships", [])[:4]:
            print("  ", r)
        print(f"Relationship Chains ({len(res.get('relationship_chains', []))}):", res.get("relationship_chains"))
        print("Timeline:", res.get("timeline"))
        print("Evidence Gaps:", res.get("evidence_gaps"))
        print()

if __name__ == "__main__":
    asyncio.run(main())
