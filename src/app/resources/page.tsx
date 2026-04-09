import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { 
  BookOpen, 
  Video, 
  FileCheck, 
  FileText, 
  Download, 
  ExternalLink,
  PlayCircle,
  GraduationCap,
  ArrowRight
} from 'lucide-react';

export default function ResourcesPage() {
  const ebooks = [
    { title: "CPA's Guide to Canada", author: "IndoCanada Professionals", type: "PDF", size: "2.4 MB" },
    { title: "IT Careers in Ontario", author: "IndoCanada Professionals", type: "PDF", size: "1.8 MB" },
    { title: "Medical Licensing Roadmap", author: "IndoCanada Health Team", type: "PDF", size: "3.1 MB" },
    { title: "Engineering Success Story", author: "IndoCanada Engineering", type: "PDF", size: "2.0 MB" }
  ];

  const workshops = [
    { title: "Taxes for Newcomers 2024", duration: "45 mins", date: "Jan 12, 2024", platform: "YouTube" },
    { title: "Resume Polish Workshop", duration: "1h 15m", date: "Feb 08, 2024", platform: "Zoom Recording" },
    { title: "Buying Your First Home", duration: "55 mins", date: "Mar 15, 2024", platform: "YouTube" },
    { title: "Interview Prep for IT", duration: "1h 05m", date: "Apr 02, 2024", platform: "YouTube" }
  ];

  const templates = [
    { title: "Standard Canadian Resume", type: "Word Doc", category: "Career" },
    { title: "Professional Cover Letter", type: "Word Doc", category: "Career" },
    { title: "Networking Message Hub", type: "PDF", category: "Communication" },
    { title: "Rental Application Bundle", type: "ZIP", category: "Settlement" }
  ];

  return (
    <>
      <Navbar />
      
      <div className="pt-32 pb-16 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="badge badge-accent mb-4">Resource Center</div>
            <h1 className="text-5xl font-display font-black mb-6">Learn. Succeed. <span className="text-gradient">Thrive.</span></h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Access our library of expert-led guides, professional templates, and video workshops designed specifically for Indian professionals in Canada.
            </p>
          </div>
        </div>
      </div>

      <section className="section bg-white">
        <div className="container">
          
          {/* E-Books Section */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
              <BookOpen className="text-primary-600" size={28} />
              <h2 className="text-3xl font-display font-bold">E-Books & Detailed Guides</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ebooks.map((book, idx) => (
                <div key={idx} className="card bg-gray-50 flex flex-col hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <FileText className="text-primary-400" size={24} />
                    </div>
                    <span className="text-xs font-bold text-gray-400">{book.type} • {book.size}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 leading-tight">{book.title}</h3>
                  <p className="text-sm text-gray-500 mb-6">By {book.author}</p>
                  <button className="btn btn-outline btn-sm mt-auto w-full flex items-center justify-center gap-2 bg-white">
                    <Download size={14} /> Download Guide
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Workshop Videos */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
              <Video className="text-error-600" size={28} />
              <h2 className="text-3xl font-display font-bold">Video Workshop Archive</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {workshops.map((video, idx) => (
                <div key={idx} className="card-glass border border-gray-200 p-0 overflow-hidden flex flex-col sm:flex-row hover:shadow-lg transition-shadow">
                   <div className="w-full sm:w-48 bg-gray-900 flex items-center justify-center relative group cursor-pointer aspect-video sm:aspect-auto">
                      <PlayCircle className="text-white opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" size={48} />
                   </div>
                   <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg leading-tight">{video.title}</h3>
                        <span className="badge badge-error">{video.platform}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500 mb-6">
                        <span>{video.duration}</span>
                        <span>•</span>
                        <span>Recorded {video.date}</span>
                      </div>
                      <Link href="#" className="font-bold text-error-600 text-sm mt-auto flex items-center gap-2 hover:underline">
                        Watch Full Session <ExternalLink size={14} />
                      </Link>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Templates Section */}
          <div>
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
              <FileCheck className="text-success-600" size={28} />
              <h2 className="text-3xl font-display font-bold">Templates & Worksheets</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {templates.map((temp, idx) => (
                <div key={idx} className="card bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="badge badge-success mb-4">{temp.category}</div>
                  <h3 className="font-bold text-lg mb-4">{temp.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-6 font-medium">
                     <span>{temp.type}</span>
                     <span>•</span>
                     <span>Free Access</span>
                  </div>
                  <button className="btn btn-ghost p-0 font-bold text-success-600 text-sm flex items-center gap-2 hover:gap-3 transition-all">
                    Access Template <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Career Uplift CTA */}
      <section className="bg-primary-900 text-white border-y border-primary-800 py-20 text-center">
         <div className="container max-w-4xl mx-auto">
            <GraduationCap size={64} className="mx-auto mb-6 text-accent-500" />
            <h2 className="text-4xl font-display font-bold mb-6">Want to Contribute?</h2>
            <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
               If you're a subject matter expert or an established professional in Canada, we'd love to host your guide or workshop recordings on our platform.
            </p>
            <div className="flex justify-center gap-4">
               <button className="btn btn-yellow btn-lg">Become a Contributor</button>
               <Link href="/portal/auth" className="btn btn-outline btn-lg border-primary-700 text-white">Join Community</Link>
            </div>
         </div>
      </section>

      <Footer />
    </>
  );
}
