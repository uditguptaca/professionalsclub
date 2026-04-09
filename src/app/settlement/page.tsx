import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { 
  Home, 
  Banknote, 
  HeartPulse, 
  Car, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Info
} from 'lucide-react';

export default function SettlementPage() {
  const categories = [
    {
      title: "Housing & Rentals",
      icon: <Home className="text-primary-600" size={32} />,
      description: "Finding your first home in Canada. Understanding leases, credit scores for rentals, and popular neighborhoods.",
      items: ["Rental Market Overview", "Credit Score for Newcomers", "Tenant Rights & Responsibilities", "Temporary vs Long-term Housing"]
    },
    {
      title: "Financial Literacy",
      icon: <Banknote className="text-success-600" size={32} />,
      description: "Setting up your Canadian financial life. Banking, credit cards, and understanding the tax system.",
      items: ["Opening a Bank Account", "Building Credit History", "GST/HST & Income Tax 101", "Registered Savings Accounts (RRSP, TFSA)"]
    },
    {
      title: "Healthcare",
      icon: <HeartPulse className="text-error-600" size={32} />,
      description: "Navigating the Canadian universal healthcare system. Getting your Provincial health card.",
      items: ["Applying for Health Cards (OHIP, etc.)", "Finding a Family Doctor", "Walk-in Clinics & Emergencies", "Dental & Vision Coverage"]
    },
    {
      title: "Transportation",
      icon: <Car className="text-accent-600" size={32} />,
      description: "Getting around your new city. Driver's licenses, public transit, and buying your first car.",
      items: ["Exchanging Foreign Driver Licenses", "Public Transit Systems (PRESTO, etc.)", "Car Insurance Basics", "Winter Driving Safety"]
    },
    {
      title: "Legal & SIN",
      icon: <ShieldCheck className="text-primary-800" size={32} />,
      description: "Essential documentation and legal requirements for living and working in Canada.",
      items: ["Social Insurance Number (SIN)", "Work Authorization & Permits", "PR Card & Residency Obligations", "Legal Aid Resources"]
    }
  ];

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <div className="pt-32 pb-16 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="badge badge-primary mb-4">Settlement Hub</div>
            <h1 className="text-5xl font-display font-black mb-6">Welcome to <span className="text-gradient">Canada</span></h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your comprehensive guide to settling smoothly. We've compiled the most essential information to help you navigate your first weeks and months in Canada.
            </p>
          </div>
        </div>
      </div>

      <section className="section bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat, idx) => (
              <div key={idx} className="card-glass bg-white flex flex-col hover:-translate-y-1 transition duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                  {cat.icon}
                </div>
                <h3 className="text-2xl font-bold font-display mb-4">{cat.title}</h3>
                <p className="text-gray-600 text-sm mb-6 flex-grow">{cat.description}</p>
                
                <ul className="space-y-3 mb-8">
                  {cat.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                
                <Link href="#" className="font-bold text-primary-600 text-sm inline-flex items-center gap-2 hover:gap-3 transition-all">
                  Read Detailed Guide <ArrowRight size={16} />
                </Link>
              </div>
            ))}

            {/* Support CTA Card */}
            <div className="card-glass bg-primary-900 text-white flex flex-col justify-center items-center text-center p-10">
              <div className="w-20 h-20 rounded-full bg-primary-800 flex items-center justify-center mb-6">
                <Info size={40} className="text-primary-300" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-4">Personalized Guidance?</h3>
              <p className="text-primary-100 text-sm mb-8">
                Our community mentors are here to help you with specific questions about your professional field and city.
              </p>
              <Link href="/portal/auth" className="btn btn-yellow w-full">Ask a Mentor</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Checklist Section */}
      <section className="section bg-gray-50 border-y border-gray-200">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <div className="overline text-primary-600">Free Download</div>
                <h2 className="text-4xl font-display font-bold mb-6">The Ultimate Newcomer Checklist</h2>
                <p className="text-gray-600 mb-8 text-lg">
                  Don't miss a single step. Download our comprehensive PDF checklist covering everything you need to do before landing and during your first 30 days.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="btn btn-primary btn-lg">Download PDF Guide</button>
                  <Link href="/resources" className="btn btn-outline btn-lg bg-white">View All Resources</Link>
                </div>
              </div>
              <div className="flex-1 w-full max-w-sm">
                 <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 transform rotate-2">
                    <h4 className="font-bold text-lg mb-4 border-b pb-2">First 7 Days Checklist</h4>
                    <div className="space-y-4">
                       {[
                         "Applied for SIN at Service Canada",
                         "Opened a Canadian Bank Account",
                         "Obtained a Canadian Phone Number",
                         "Applied for Provincial Health Card",
                         "Explored local transit routes"
                       ].map((item, i) => (
                         <div key={i} className="flex items-center gap-3">
                           <div className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"></div>
                           <span className="text-sm text-gray-600">{item}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
