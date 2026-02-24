import React from "react";

// Finalized Next.js/Tailwind Component for the Catering Automation Section
// This is what you show her to explain how the bot works.

export const AutomationSection = () => {
  return (
    <section className="bg-red-50 py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1">
          <div className="inline-block bg-red-100 text-red-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
            AI-POWERED
          </div>
          <h2 className="text-4xl font-bold mb-6 text-stone-900">Catering on Autopilot</h2>
          <p className="text-lg text-stone-600 mb-8 leading-relaxed">
            Stop losing hours in your DMs. Our intelligent catering assistant handles quotes, menu
            selections, and lead qualification 24/7—so you only talk to customers when they are
            ready to pay.
          </p>
          <div className="space-y-4">
            {[
              "Instant Quotes for Customers",
              "Automated Menu Delivery via Instagram DM",
              "Zero-Effort Lead Qualification",
              "Direct-to-SMS Notifications for Mandy",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 font-medium text-stone-800">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Mock Chat Interface */}
        <div className="flex-1 w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
          <div className="bg-red-700 p-4 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
              M
            </div>
            <div>
              <p className="font-bold leading-none">Mandy's Assistant</p>
              <p className="text-xs text-red-100">Online | Replies instantly</p>
            </div>
          </div>
          <div className="p-6 space-y-4 min-h-[300px]">
            <div className="bg-stone-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
              Hi! I can help you book a catering order. How many people are you feeding?
            </div>
            <div className="bg-red-600 p-3 rounded-2xl rounded-tr-none max-w-[80%] ml-auto text-sm text-white">
              About 25 people for a lunch meeting.
            </div>
            <div className="bg-stone-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
              Perfect! For 25 people, I recommend our "Classic Feast" tray package. Would you like
              me to send the quote to your email?
            </div>
          </div>
          <div className="p-4 border-t border-stone-100">
            <div className="bg-stone-50 p-2 rounded-lg text-stone-400 text-sm">
              Type your answer...
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
