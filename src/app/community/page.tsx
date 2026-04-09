import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Video, PlayCircle, BookOpen, MessageSquare, TrendingUp, HandHeart } from 'lucide-react';

export default function CommunityPage() {
  return (
    <>
      <Navbar />
      
      <div className="pt-32 pb-16 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-display font-black mb-6">Community & Media</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Dive into our rich collection of guidance sessions, YouTube tutorials, and community-driven content designed to help you settle smoothly into Canadian life.
            </p>
          </div>
        </div>
      </div>

      <section className="section bg-white">
        <div className="container">
          
          <div className="flex flex-col md:flex-row gap-12 max-w-6xl mx-auto items-center mb-16">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-error-50 text-error-600 rounded-full text-sm font-bold mb-4 border border-error-100">
                <Video size={16} /> Official Channel
              </div>
              <h2 className="text-4xl font-display font-bold mb-6">IndoCanada on YouTube</h2>
              <p className="text-lg text-gray-600 mb-6">
                We regularly post comprehensive video guides on everything from financial literacy to cultural adaptation. Watch our past workshops, tutorials, and settlement guidance sessions directly on our official YouTube channel.
              </p>
              <div className="flex gap-4">
                 <button className="btn btn-danger shadow-sm border border-error-600">Subscribe on YouTube</button>
                 <button className="btn btn-outline border-gray-300">Browse Latest Videos</button>
              </div>
            </div>
            
            <div className="flex-1">
               {/* Mock Video Player Embed */}
               <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden aspect-video relative flex items-center justify-center group cursor-pointer border border-gray-800">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition duration-500"></div>
                 <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
                 <div className="w-20 h-20 bg-error-600 rounded-full flex items-center justify-center z-10 shadow-lg shadow-error-600/50 group-hover:scale-110 transition duration-300">
                   <PlayCircle size={40} className="text-white ml-2" />
                 </div>
                 <div className="absolute bottom-6 left-6 right-6 z-10">
                   <div className="text-white font-bold text-xl drop-shadow-md">Financial Literacy for Newcomers: Taxes 101</div>
                   <div className="text-gray-300 text-sm flex gap-4 mt-2 font-medium">
                     <span>Educational Workshop</span>
                     <span>•</span>
                     <span>45 Mins</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Additional Guidance Resources */}
          <div className="max-w-6xl mx-auto border-t border-gray-200 pt-16">
            <h3 className="text-2xl font-bold font-display mb-8 text-center">More Settlement Guidance Resources</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="card-glass bg-gray-50 border border-gray-200 p-8 shadow-sm hover:border-primary-300 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-lg border border-gray-300 text-primary-600 flex items-center justify-center mb-6 shadow-sm">
                   <TrendingUp size={24} />
                 </div>
                 <h4 className="font-bold text-xl mb-3">Finance & Tax Guides</h4>
                 <p className="text-gray-600 text-sm leading-relaxed mb-6">Written tutorials on building Canadian credit, filing your first tax return, and managing employment income securely.</p>
                 <a href="#" className="font-bold text-primary-600 text-sm hover:underline">Read FinTech Guides →</a>
               </div>

               <div className="card-glass bg-gray-50 border border-gray-200 p-8 shadow-sm hover:border-success-300 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-lg border border-gray-300 text-success-600 flex items-center justify-center mb-6 shadow-sm">
                   <HandHeart size={24} />
                 </div>
                 <h4 className="font-bold text-xl mb-3">Cultural Adaptation Forums</h4>
                 <p className="text-gray-600 text-sm leading-relaxed mb-6">Engage with fellow newcomers. Ask questions about local customs, public transit, securing a lease, and daily Canadian life.</p>
                 <a href="#" className="font-bold text-success-600 text-sm hover:underline">Join Discussions →</a>
               </div>

               <div className="card-glass bg-gray-50 border border-gray-200 p-8 shadow-sm hover:border-accent-400 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-lg border border-gray-300 text-accent-600 flex items-center justify-center mb-6 shadow-sm">
                   <BookOpen size={24} />
                 </div>
                 <h4 className="font-bold text-xl mb-3">Professional E-Books</h4>
                 <p className="text-gray-600 text-sm leading-relaxed mb-6">Download our comprehensive settlement checklists and e-books authored by industry leaders and community mentors.</p>
                 <Link href="/resources" className="font-bold text-accent-700 text-sm hover:underline">Browse Library →</Link>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Box */}
      <section className="bg-primary-900 text-white border-primary-800 py-16 text-center shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)]">
         <div className="container">
           <MessageSquare size={48} className="mx-auto mb-6 text-primary-400" />
           <h2 className="text-3xl font-display font-bold mb-4">Have Questions About Settling In?</h2>
           <p className="text-primary-100 mb-8 max-w-xl mx-auto text-lg hover:text-white transition-colors">
             Reach out on our dedicated portal or talk to a mentor to get personalized advice tailored to your professional background.
           </p>
           <Link href="/portal/auth" className="btn btn-accent btn-lg text-gray-900 shadow-glow-accent">Request Career Guidance</Link>
         </div>
      </section>

      <Footer />
    </>
  );
}
