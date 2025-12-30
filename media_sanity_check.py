import feedparser
import time
import os
from datetime import datetime

# --- CONFIGURATION ---
# We use a standard RSS feed as our raw "Signal" source.
RSS_URL = "http://feeds.reuters.com/reuters/worldNews"
OUTPUT_FILE = "Daily_Sanity_Protocol.txt"

# --- THE PROTOCOL LOGIC ---
class ProtocolEngine:
    def __init__(self):
        self.header = "RFC 2025: SEMANTIC INTEGRITY REPORT\n"
        self.header += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        self.header += "Operator: Owen\n"
        self.header += "Status: ACTIVE FILTERING\n"
        self.header += "-" * 50 + "\n\n"

    def analyze_semantic_distance(self, text):
        """
        In the full version, this sends the text to the AI API.
        For this local prototype, we simulate the filter logic based on keywords.
        """
        # Simulated logic: Detect "Rage Bait" vs "Constructive" signals
        rage_triggers = ["outrage", "blast", "slam", "destroy", "shocking"]
        constructive_triggers = ["talks", "treaty", "agree", "plan", "development"]

        text_lower = text.lower()
        
        # Calculate scores (Mocking the AI's complex math for the prototype)
        rage_score = sum(1 for word in rage_triggers if word in text_lower)
        constructive_score = sum(1 for word in constructive_triggers if word in text_lower)

        if rage_score > constructive_score:
            return "BLURRED (Low Signal / High Noise)"
        elif constructive_score > 0:
            return "HIGHLIGHT (Potential Constructive Tension)"
        else:
            return "NEUTRAL (Standard Noise)"

    def run(self):
        print("Initializing Protocol Engine...")
        print(f"Connecting to Feed: {RSS_URL}")
        
        feed = feedparser.parse(RSS_URL)
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(self.header)
            
            print(f"Processing {len(feed.entries)} packets...")
            
            for entry in feed.entries:
                # 1. Ingest
                headline = entry.title
                summary = entry.summary
                
                # 2. Transcode (Apply the Filter)
                status = self.analyze_semantic_distance(headline + " " + summary)
                
                # 3. Output Log
                log_entry = f"[{status}]\n"
                log_entry += f"HEADLINE: {headline}\n"
                log_entry += f"SUMMARY: {summary[:100]}...\n"
                log_entry += "-" * 30 + "\n"
                
                f.write(log_entry)
                
        print(f"SUCCESS. Protocol Artifact created at: {os.path.abspath(OUTPUT_FILE)}")
        print("You may now proceed to your appointment.")

# --- EXECUTION ---
if __name__ == "__main__":
    try:
        engine = ProtocolEngine()
        engine.run()
    except Exception as e:
        print(f"PROTOCOL FAILURE: {e}")
        input("Press Enter to exit...")