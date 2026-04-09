import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Calendar, MapPin, Clock, Users, Video } from 'lucide-react';

export default function EventsPage() {
  return (
    <>
      <Navbar />
      
      <div className="pt-32 pb-16 bg-gray-50 border-b border-gray-200">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-display font-black mb-6">Events & Meetups</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Step into your Canadian life; a world of opportunities and friendships awaits. Participate in our informal monthly gatherings to network and connect with peers.
            </p>
          </div>
        </div>
      </div>

      <section className="section bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            
            {/* Main Featured Event */}
            <div className="lg:col-span-2">
              <div className="card-glass bg-white p-0 overflow-hidden shadow-lg border border-gray-200">
                 <div className="bg-primary-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/30 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="badge bg-primary-600 border-none text-white mb-4">Featured Event</div>
                    <h2 className="text-3xl font-display font-bold mb-2 relative z-10">Toronto Monthly Community Meetup</h2>
                    <p className="text-primary-100 relative z-10">An informal gathering to welcome newcomers, share settlement guidance, and expand professional networks.</p>
                 </div>
                 <div className="p-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     <div className="flex items-center gap-3 text-gray-700">
                       <Calendar className="text-primary-600" />
                       <div>
                         <div className="font-bold">Last Friday of the Month</div>
                         <div className="text-sm text-gray-500">Recurring automatically</div>
                       </div>
                     </div>
                     <div className="flex items-center gap-3 text-gray-700">
                       <Clock className="text-primary-600" />
                       <div>
                         <div className="font-bold">6:00 PM - 9:00 PM</div>
                         <div className="text-sm text-gray-500">EST Timezone</div>
                       </div>
                     </div>
                     <div className="flex items-center gap-3 text-gray-700">
                       <MapPin className="text-primary-600" />
                       <div>
                         <div className="font-bold">Downtown Toronto</div>
                         <div className="text-sm text-gray-500">Exact venue sent upon RSVP</div>
                       </div>
                     </div>
                     <div className="flex items-center gap-3 text-gray-700">
                       <Users className="text-primary-600" />
                       <div>
                         <div className="font-bold">Limited Capacity</div>
                         <div className="text-sm text-gray-500">Pre-registration required</div>
                       </div>
                     </div>
                   </div>
                   
                   <button className="btn btn-primary w-full md:w-auto">RSVP for Next Meetup</button>
                 </div>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex flex-col gap-6">
              <div className="card-glass bg-gray-50 border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Video className="text-error-600" size={24} />
                  <h3 className="font-bold text-lg font-display">Virtual Workshops</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Can't make it in person? We host weekly financial literacy and cultural adaptation guidance sessions online.</p>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border border-gray-100 text-sm">
                    <div className="font-bold text-gray-900 mb-1">Taxes for Newcomers</div>
                    <div className="text-error-600 font-semibold text-xs mb-1">YouTube Livestream</div>
                    <div className="text-gray-500 text-xs">Every Tuesday @ 7 PM</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-100 text-sm">
                    <div className="font-bold text-gray-900 mb-1">Resume Polish Workshop</div>
                    <div className="text-error-600 font-semibold text-xs mb-1">Zoom Meeting</div>
                    <div className="text-gray-500 text-xs">Every Thursday @ 6 PM</div>
                  </div>
                </div>
                <button className="btn btn-outline w-full mt-4 text-sm bg-white border-gray-300">View Online Schedule</button>
              </div>

              <div className="card-glass bg-primary-50 border border-primary-100 p-6 shadow-sm text-center">
                 <h3 className="font-bold text-lg font-display mb-2 text-primary-900">Want to Host an Event?</h3>
                 <p className="text-sm text-primary-700 mb-4">If you're a mentor or community leader, we welcome you to lead sessions or local meetups in your city.</p>
                 <button className="btn btn-primary w-full text-sm">Contact Organizers</button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
