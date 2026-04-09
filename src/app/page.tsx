import Link from 'next/link';
import { ArrowRight, Users, Briefcase, Calendar, MessageSquare, PlayCircle, HeartHandshake, MapPin } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid"></div>
        <div className="container relative z-10">
          <div className="hero-content text-center mx-auto">
            <div className="hero-badge mx-auto bg-primary-50 border-primary-100 mb-8 inline-flex">
              <span className="dot bg-primary-500"></span>
              <span className="text-primary-800 font-bold">Empowering Indian Professionals in Canada</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-display font-black mb-6 text-gray-900 leading-tight">
              Welcome To <span className="text-gradient">Canada</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Step into your Canadian life; a world of opportunities and friendships awaits. We are a premier association of Indian professionals committed to mutual growth.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/portal/auth" className="btn btn-primary btn-lg shadow-glow">
                Join Community Hub <ArrowRight size={20} />
              </Link>
              <Link href="/events" className="btn btn-outline btn-lg shadow-sm border-gray-300 bg-white">
                Register for Monthly Meetup
              </Link>
            </div>
            
            <div className="hero-stats justify-center mt-12 mb-0 pb-0">
              <div className="hero-stat">
                <div className="value text-primary-600">5,000+</div>
                <div className="label">Verified Members</div>
              </div>
              <div className="hero-stat">
                <div className="value text-accent-600">50+</div>
                <div className="label">Monthly Events</div>
              </div>
              <div className="hero-stat">
                <div className="value text-success-600">98%</div>
                <div className="label">Settlement Success</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Overview */}
      <section className="section-sm bg-gray-50 border-y border-gray-200">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-6">Building Bridges, Fostering Success</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              We provide networking, mentoring, and educational workshops to help our members thrive professionally and personally in Canada. IndoCanada Professionals Association is a broad-based association supporting a variety of professions in Canada, including CPAs, doctors, engineers, MBAs, marketers, educators, IT professionals, and tradespeople.
            </p>
          </div>
        </div>
      </section>

      {/* The 5 Pillars of IndoCanada Club */}
      <section className="section bg-white">
        <div className="container">
          <div className="section-header">
            <div className="overline text-accent-600">Our Core Services</div>
            <h2>More Than Just Referrals</h2>
            <p>From initial settlement to securing your dream job, we offer comprehensive support at every step of your Canadian journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            
            {/* 1. Meetups */}
            <div className="card-glass bg-white flex flex-col gap-4 text-center items-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center mb-2 shadow-sm border border-accent-100">
                <Calendar size={32} />
              </div>
              <h3 className="text-xl font-bold font-display">Monthly Meetups</h3>
              <p className="text-gray-600 text-sm">Participate in our informal monthly gatherings to network and connect with peers face-to-face.</p>
              <Link href="/events" className="text-accent-600 font-bold text-sm mt-auto hover:underline">View Schedule →</Link>
            </div>

            {/* 2. Career & Referrals */}
            <div className="card-glass bg-white flex flex-col gap-4 text-center items-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-2 shadow-sm border border-primary-100">
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-bold font-display">Career Support & Referrals</h3>
              <p className="text-gray-600 text-sm">Benefit from career referrals and guidance. Use our dedicated portal to match with mentors at top Canadian employers.</p>
              <Link href="/portal/auth" className="text-primary-600 font-bold text-sm mt-auto hover:underline">Access Portal →</Link>
            </div>

            {/* 3. Settlement Guidance */}
            <div className="card-glass bg-white flex flex-col gap-4 text-center items-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center mb-2 shadow-sm border border-success-100">
                <MapPin size={32} />
              </div>
              <h3 className="text-xl font-bold font-display">Settlement Guidance</h3>
              <p className="text-gray-600 text-sm">Receive advice on housing, taxes, financial literacy, and other essentials for settling smoothly in Canada.</p>
              <Link href="/settlement" className="text-success-600 font-bold text-sm mt-auto hover:underline">Get Guidance →</Link>
            </div>

            {/* 4. YouTube Channel & Ed */}
            <div className="card-glass bg-white flex flex-col gap-4 text-center items-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-error-50 text-error-600 flex items-center justify-center mb-2 shadow-sm border border-error-100">
                <PlayCircle size={32} />
              </div>
              <h3 className="text-xl font-bold font-display">Educational & Resources</h3>
              <p className="text-gray-600 text-sm">Access rich video content. We conduct guidance sessions, workshops, and tutorials broadcast across our media channels.</p>
              <Link href="/resources" className="text-error-600 font-bold text-sm mt-auto hover:underline">Browse Library →</Link>
            </div>

            {/* 5. Social Integration */}
            <div className="card-glass bg-white flex flex-col gap-4 text-center items-center hover:-translate-y-2 transition-transform duration-300 lg:col-span-2 max-w-2xl mx-auto w-full">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center mb-2 shadow-sm border border-gray-200">
                <HeartHandshake size={32} />
              </div>
              <h3 className="text-xl font-bold font-display">Cultural Adaptation</h3>
              <p className="text-gray-600 text-sm max-w-md">Facilitating sessions on adapting to everyday life in Canada. Connecting communities, creating opportunities.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="section bg-primary-900 text-white relative overflow-hidden">
        {/* Background Graphic */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-700/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="w-48 h-48 rounded-full border-4 border-white/20 overflow-hidden shrink-0 bg-primary-800 flex justify-center items-center">
               <Users size={64} className="text-white/50" />
            </div>
            <div>
              <blockquote className="text-2xl md:text-3xl font-display font-medium leading-relaxed mb-6">
                "Building Bridges, Enriching Lives: IndoCanada Professionals. Facilitating smoother transitions for immigrants. Connecting communities, creating opportunities."
              </blockquote>
              <div className="font-bold text-xl text-primary-200">Udit Gupta</div>
              <div className="text-primary-100">Founder, CEO & Director, IndoCanada Professionals</div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="section bg-gray-50 border-t border-gray-200">
        <div className="container">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold">Latest Community Club News</h2>
              <p className="text-gray-600 mt-2">Insights and advice for life in Canada.</p>
            </div>
            <Link href="/news" className="text-primary-600 font-bold hover:underline hidden sm:block">View All News →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-glass bg-white p-6 hover:-translate-y-1 transition duration-300">
              <div className="badge badge-primary mb-4">April 29, 2025</div>
              <h3 className="text-lg font-bold mb-3 hover:text-primary-600 cursor-pointer">Tips for Securing Employment Before Arriving in Ontario</h3>
              <p className="text-sm text-gray-600 line-clamp-3">Essential strategies for job hunting in the robust Ontario market before you even land.</p>
            </div>
            <div className="card-glass bg-white p-6 hover:-translate-y-1 transition duration-300">
              <div className="badge badge-primary mb-4">April 22, 2025</div>
              <h3 className="text-lg font-bold mb-3 hover:text-primary-600 cursor-pointer">Residential Schools in Canada: A History</h3>
              <p className="text-sm text-gray-600 line-clamp-3">Understanding the cultural history and foundational knowledge required for new immigrants.</p>
            </div>
            <div className="card-glass bg-white p-6 hover:-translate-y-1 transition duration-300">
              <div className="badge badge-primary mb-4">April 14, 2025</div>
              <h3 className="text-lg font-bold mb-3 hover:text-primary-600 cursor-pointer">How Canadian Immigration Laws Are Enforced</h3>
              <p className="text-sm text-gray-600 line-clamp-3">A deep dive into the policies shaping newcomer experiences and settlement logistics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white text-center border-t border-gray-200">
        <div className="container">
          <h2 className="text-4xl font-display font-bold mb-6">Ready to Join the Club?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Empowering Indian professionals in Canada through networking, mentoring, and educational workshops. Join us to connect, grow, and succeed in your professional journey.
          </p>
          <div className="flex justify-center gap-4">
             <Link href="/portal/auth" className="btn btn-primary btn-lg">Join the Directory & Portal</Link>
             <Link href="/about" className="btn btn-outline btn-lg border-gray-300">Learn More About Us</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
