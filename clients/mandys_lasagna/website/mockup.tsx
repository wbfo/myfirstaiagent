import React from "react";

// This is a draft mockup structure for the Next.js / Tailwind site
// Focus: Social Proof (Reviews) and Catering Conversion

const LandingPage = () => {
  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen font-sans">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tighter text-red-700">MANDY'S LASAGNA</h1>
        <div className="space-x-6 hidden md:block">
          <a href="#menu" className="hover:text-red-700">
            Menu
          </a>
          <a href="#catering" className="hover:text-red-700 font-semibold">
            Catering
          </a>
          <a href="#reviews" className="hover:text-red-700">
            Reviews
          </a>
        </div>
        <button className="bg-red-700 text-white px-6 py-2 rounded-full font-bold hover:bg-red-800">
          Order Now
        </button>
      </nav>

      {/* Hero Section */}
      <header className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          The Best Lasagna <br />
          <span className="text-red-700">You've Ever Tasted.</span>
        </h2>
        <p className="text-xl text-stone-600 mb-10">
          Hand-crafted in [City], delivered fresh to your door. Discover why 1,500+ people gave us
          4.5 stars.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <button className="bg-red-700 text-white px-10 py-4 rounded-lg text-lg font-bold">
            Order for Delivery
          </button>
          <button className="bg-white border-2 border-stone-900 px-10 py-4 rounded-lg text-lg font-bold">
            Book Catering
          </button>
        </div>
      </header>

      {/* Social Proof Bar */}
      <section className="bg-stone-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around items-center text-center">
          <div>
            <p className="text-3xl font-bold">4.5/5</p>
            <p className="text-stone-400 text-sm uppercase">Uber Eats Rating</p>
          </div>
          <div>
            <p className="text-3xl font-bold">1,500+</p>
            <p className="text-stone-400 text-sm uppercase">Verified Reviews</p>
          </div>
          <div>
            <p className="text-3xl font-bold">100%</p>
            <p className="text-stone-400 text-sm uppercase">Hand-Made Daily</p>
          </div>
        </div>
      </section>

      {/* Catering Focus */}
      <section
        id="catering"
        className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center"
      >
        <div>
          <h3 className="text-4xl font-bold mb-6">Corporate & Event Catering</h3>
          <p className="text-lg text-stone-600 mb-8">
            Feeding a crowd? Our lasagna trays are the perfect solution for office lunches,
            weddings, and family gatherings. We handle the setup; you take the credit.
          </p>
          <ul className="space-y-4 mb-10">
            <li className="flex items-center gap-3">
              <span className="text-green-600 font-bold">✓</span> Custom Menu Planning
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-600 font-bold">✓</span> Bulk Discounts Available
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-600 font-bold">✓</span> On-Time Delivery Guaranteed
            </li>
          </ul>
          <button className="bg-stone-900 text-white px-8 py-3 rounded-lg font-bold">
            Get a Catering Quote
          </button>
        </div>
        <div className="bg-stone-200 aspect-video rounded-2xl flex items-center justify-center text-stone-400">
          [Image Placeholder: Giant Tray of Lasagna]
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
