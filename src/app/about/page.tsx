import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Target, Users, Briefcase, GraduationCap, Globe, Banknote } from 'lucide-react';

export default function AboutPage() {
  const pillars = [
    {
      id: "01",
      title: "Social Integration",
      description: "Connecting newcomers through community networking events. Step into your Canadian life; a world of opportunities and friendships awaits.",
      icon: <Users className="text-primary-600" size={24} />
    },
    {
      id: "02",
      title: "Career Development",
      description: "Providing specialized mentoring for career advancement. Benefit from career referrals and guidance to enhance your professional journey.",
      icon: <Briefcase className="text-primary-600" size={24} />
    },
    {
      id: "03",
      title: "Financial Literacy",
      description: "Offering educational workshops on employment and taxes. Receive advice on housing, taxes, and other essentials for settling smoothly.",
      icon: <Banknote className="text-primary-600" size={24} />
    },
    {
      id: "04",
      title: "Professional Networking",
      description: "Expanding professional networks for Internationally Educated Professionals. Building bridges, fostering success.",
      icon: <Target className="text-primary-600" size={24} />
    },
    {
      id: "05",
      title: "Cultural Adaptation",
      description: "Facilitating sessions on adapting to everyday life in Canada. Connecting communities, creating opportunities.",
      icon: <Globe className="text-primary-600" size={24} />
    }
  ];

  return (
    <>
      <Navbar />
      
      <div className="pt-32 pb-16 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-display font-black mb-6">Who We Are</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We are a premier association of Indian professionals in Canada, committed to mutual growth and support.
            </p>
          </div>
        </div>
      </div>

      <section className="section bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center mb-6 shadow-sm border border-accent-100">
                <Target size={32} />
              </div>
              <h2 className="text-3xl font-display font-bold mb-6">What We Do</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Networking, mentoring, and workshops for newcomers to enhance careers and skills. 
              </p>
              <p className="text-gray-600 mb-8">
                IndoCanada Professionals is a broad-based association supporting a variety of professions in Canada, including CPAs, doctors, engineers, MBAs, marketers, educators, IT professionals, and tradespeople. Our organization aids individuals from diverse fields in navigating their careers and thriving in the Canadian workplace.
              </p>
              <Link href="/portal/auth" className="btn btn-primary">Join the Community Network</Link>
            </div>
            
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm relative">
               {/* Decorative Element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-bl-3xl blur-2xl"></div>
               <h3 className="text-xl font-bold font-display border-b border-gray-200 pb-4 mb-6">Our Core Pillars</h3>
               
               <div className="flex flex-col gap-6">
                 {pillars.map((pillar) => (
                   <div key={pillar.id} className="flex gap-4">
                     <div className="mt-1 flex-shrink-0">
                       <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center font-mono font-bold text-sm text-gray-400">
                         {pillar.id}
                       </div>
                     </div>
                     <div>
                       <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                         {pillar.title}
                       </h4>
                       <p className="text-sm text-gray-600 leading-relaxed">{pillar.description}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-gray-50 border-t border-gray-200">
        <div className="container text-center max-w-3xl mx-auto">
           <h2 className="text-3xl font-display font-bold mb-6">Our Leadership</h2>
           <div className="card-glass bg-white p-8 inline-block mt-4 text-left shadow-md">
             <div className="flex items-center gap-6">
               <div className="w-24 h-24 rounded-full bg-primary-100 border-4 border-primary-50 flex items-center justify-center text-primary-600 shrink-0 shadow-inner">
                 <Users size={32} />
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-gray-900 font-display">Udit Gupta</h3>
                 <p className="text-primary-600 font-semibold mb-2">Founder, CEO & Director</p>
                 <p className="text-gray-600 text-sm">Building bridges, enriching lives. Empowering Indian professionals in Canada through networking, mentoring, and educational workshops.</p>
               </div>
             </div>
           </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
