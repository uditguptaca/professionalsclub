import { Company, JobSeeker, Employee, ReferralRequest, Chat, Message, EventItem, DiscussionPost, NewsArticle, PricingRule, RequestPolicy, Payment, Notification, VerificationRecord, AdminStats } from '@/types';

export const companies: Company[] = [
  { id: 'c1', name: 'Shopify', logo: '🟢', domain: 'shopify.com', industry: 'Technology', size: '10,000+', location: 'Ottawa, ON', description: 'Commerce platform helping merchants sell online', openRoles: 45, activeReferrers: 12, pricingTier: 'premium', pricePerRequest: 2, active: true, featured: true, color: '#96bf48' },
  { id: 'c2', name: 'Amazon Canada', logo: '📦', domain: 'amazon.ca', industry: 'Technology', size: '50,000+', location: 'Vancouver, BC', description: 'Global technology and e-commerce company', openRoles: 120, activeReferrers: 28, pricingTier: 'premium', pricePerRequest: 3, active: true, featured: true, color: '#ff9900' },
  { id: 'c3', name: 'Royal Bank of Canada', logo: '🏦', domain: 'rbc.com', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'Canada\'s largest bank by market capitalization', openRoles: 78, activeReferrers: 15, pricingTier: 'premium', pricePerRequest: 2, active: true, featured: true, color: '#003168' },
  { id: 'c4', name: 'TD Bank', logo: '🟩', domain: 'td.com', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'One of Canada\'s Big Five banks', openRoles: 65, activeReferrers: 11, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: true, color: '#34a853' },
  { id: 'c5', name: 'Google Canada', logo: '🔍', domain: 'google.ca', industry: 'Technology', size: '10,000+', location: 'Waterloo, ON', description: 'Technology giant with offices across Canada', openRoles: 32, activeReferrers: 8, pricingTier: 'premium', pricePerRequest: 3, active: true, featured: true, color: '#4285f4' },
  { id: 'c6', name: 'Microsoft Canada', logo: '🪟', domain: 'microsoft.com', industry: 'Technology', size: '10,000+', location: 'Vancouver, BC', description: 'Global technology leader in cloud and software', openRoles: 55, activeReferrers: 14, pricingTier: 'premium', pricePerRequest: 2, active: true, featured: true, color: '#00a4ef' },
  { id: 'c7', name: 'Deloitte Canada', logo: '🔷', domain: 'deloitte.ca', industry: 'Consulting', size: '10,000+', location: 'Toronto, ON', description: 'Global professional services and consulting firm', openRoles: 90, activeReferrers: 20, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#86bc25' },
  { id: 'c8', name: 'CIBC', logo: '🏛️', domain: 'cibc.com', industry: 'Banking', size: '40,000+', location: 'Toronto, ON', description: 'Full-service financial institution', openRoles: 42, activeReferrers: 9, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#c41f3b' },
  { id: 'c9', name: 'Telus', logo: '📱', domain: 'telus.com', industry: 'Telecommunications', size: '30,000+', location: 'Vancouver, BC', description: 'Leading Canadian telecom company', openRoles: 38, activeReferrers: 7, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#4b286d' },
  { id: 'c10', name: 'Bell Canada', logo: '🔔', domain: 'bell.ca', industry: 'Telecommunications', size: '50,000+', location: 'Montreal, QC', description: 'Canada\'s largest communications company', openRoles: 50, activeReferrers: 10, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#0062a3' },
  { id: 'c11', name: 'Wealthsimple', logo: '💰', domain: 'wealthsimple.com', industry: 'Fintech', size: '1,000+', location: 'Toronto, ON', description: 'Canadian online investment management service', openRoles: 18, activeReferrers: 5, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: true, color: '#ff5722' },
  { id: 'c12', name: 'Clio', logo: '⚖️', domain: 'clio.com', industry: 'Legal Tech', size: '1,000+', location: 'Burnaby, BC', description: 'Cloud-based legal technology company', openRoles: 15, activeReferrers: 4, pricingTier: 'free', pricePerRequest: 0, active: true, featured: false, color: '#5c6bc0' },
  { id: 'c13', name: 'Manulife', logo: '🛡️', domain: 'manulife.com', industry: 'Insurance', size: '30,000+', location: 'Toronto, ON', description: 'Leading international financial services company', openRoles: 55, activeReferrers: 12, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#00843d' },
  { id: 'c14', name: 'Hootsuite', logo: '🦉', domain: 'hootsuite.com', industry: 'Technology', size: '1,000+', location: 'Vancouver, BC', description: 'Social media management platform', openRoles: 12, activeReferrers: 3, pricingTier: 'free', pricePerRequest: 0, active: true, featured: false, color: '#143059' },
  { id: 'c15', name: 'Loblaws', logo: '🛒', domain: 'loblaw.ca', industry: 'Retail', size: '50,000+', location: 'Brampton, ON', description: 'Canada\'s largest food retailer', openRoles: 25, activeReferrers: 6, pricingTier: 'free', pricePerRequest: 0, active: true, featured: false, color: '#e31837' },
  { id: 'c16', name: 'Scotiabank', logo: '🏦', domain: 'scotiabank.com', industry: 'Banking', size: '50,000+', location: 'Toronto, ON', description: 'International banking and financial services', openRoles: 60, activeReferrers: 13, pricingTier: 'premium', pricePerRequest: 2, active: true, featured: true, color: '#ef3e42' },
  { id: 'c17', name: 'OpenText', logo: '📄', domain: 'opentext.com', industry: 'Technology', size: '10,000+', location: 'Waterloo, ON', description: 'Enterprise information management software', openRoles: 30, activeReferrers: 6, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#d42a2a' },
  { id: 'c18', name: 'SAP Canada', logo: '💎', domain: 'sap.com', industry: 'Technology', size: '5,000+', location: 'Montreal, QC', description: 'Enterprise software and business solutions', openRoles: 28, activeReferrers: 7, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#008fd3' },
  { id: 'c19', name: 'Intact Financial', logo: '🔐', domain: 'intactfc.com', industry: 'Insurance', size: '10,000+', location: 'Toronto, ON', description: 'Largest provider of P&C insurance in Canada', openRoles: 22, activeReferrers: 5, pricingTier: 'free', pricePerRequest: 0, active: true, featured: false, color: '#0054a6' },
  { id: 'c20', name: 'BlackBerry', logo: '📲', domain: 'blackberry.com', industry: 'Cybersecurity', size: '3,000+', location: 'Waterloo, ON', description: 'Enterprise software and IoT security', openRoles: 16, activeReferrers: 4, pricingTier: 'free', pricePerRequest: 0, active: true, featured: false, color: '#000000' },
];

export const mockJobSeekers: JobSeeker[] = [
  {
    id: 'js1', role: 'seeker', email: 'priya.sharma@gmail.com', name: 'Priya Sharma', phone: '+1-416-555-0101', status: 'active', createdAt: '2025-11-15', verified: true, verificationLevel: 3,
    linkedinUrl: 'linkedin.com/in/priyasharma', city: 'Toronto', province: 'Ontario', country: 'Canada', workAuth: 'Canadian Citizen', openToRelocation: true, employmentStatus: 'Actively Looking',
    currentTitle: 'Senior Software Engineer', yearsExperience: 7, industry: 'Technology', skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Python'], education: 'B.Tech Computer Science, IIT Delhi',
    certifications: ['AWS Solutions Architect'], targetRoles: ['Staff Engineer', 'Engineering Manager'], targetCompanies: ['Shopify', 'Google Canada', 'Amazon Canada'],
    salaryRange: '$140K-$180K', preferredLocations: ['Toronto', 'Waterloo', 'Remote'], seniorityLevel: 'Senior',
    aboutMe: 'Passionate full-stack engineer with 7 years building scalable systems. Led teams of 5-8 engineers. Open source contributor. Looking for my next leadership role.',
    strengths: ['System Design', 'Team Leadership', 'Cloud Architecture'], portfolioUrl: 'priyasharma.dev', githubUrl: 'github.com/priyasharma', resumeFile: 'priya_sharma_resume.pdf',
    profileCompletion: 95, freeRequestsRemaining: 1, plan: 'starter', avatar: '👩‍💻'
  },
  {
    id: 'js2', role: 'seeker', email: 'arjun.patel@gmail.com', name: 'Arjun Patel', phone: '+1-604-555-0202', status: 'active', createdAt: '2025-12-01', verified: true, verificationLevel: 2,
    linkedinUrl: 'linkedin.com/in/arjunpatel', city: 'Vancouver', province: 'British Columbia', country: 'Canada', workAuth: 'Permanent Resident', openToRelocation: false, employmentStatus: 'Employed - Open to Opportunities',
    currentTitle: 'Product Manager', yearsExperience: 5, industry: 'Technology', skills: ['Product Strategy', 'Agile', 'Data Analytics', 'SQL', 'Figma'], education: 'MBA, Rotman School of Management',
    certifications: ['Certified Scrum Product Owner'], targetRoles: ['Senior Product Manager', 'Director of Product'], targetCompanies: ['Microsoft Canada', 'Amazon Canada', 'Wealthsimple'],
    salaryRange: '$130K-$160K', preferredLocations: ['Vancouver', 'Remote'], seniorityLevel: 'Mid-Senior',
    aboutMe: 'Data-driven product manager who has launched 3 B2B SaaS products from 0 to 1. Passionate about solving real user problems with technology.',
    strengths: ['Product Strategy', 'Stakeholder Management', 'Data Analysis'], resumeFile: 'arjun_patel_resume.pdf',
    profileCompletion: 88, freeRequestsRemaining: 0, plan: 'pro', avatar: '👨‍💼'
  },
  {
    id: 'js3', role: 'seeker', email: 'neha.gupta@gmail.com', name: 'Neha Gupta', phone: '+1-647-555-0303', status: 'active', createdAt: '2026-01-10', verified: true, verificationLevel: 4,
    linkedinUrl: 'linkedin.com/in/nehagupta', city: 'Toronto', province: 'Ontario', country: 'Canada', workAuth: 'Work Permit (PGWP)', openToRelocation: true, employmentStatus: 'Actively Looking',
    currentTitle: 'Data Scientist', yearsExperience: 4, industry: 'Technology', skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Tableau'], education: 'M.Sc. Data Science, University of Toronto',
    certifications: ['Google Professional Data Engineer'], targetRoles: ['Senior Data Scientist', 'ML Engineer'], targetCompanies: ['Google Canada', 'Shopify', 'Wealthsimple'],
    salaryRange: '$120K-$155K', preferredLocations: ['Toronto', 'Waterloo', 'Montreal'], seniorityLevel: 'Mid',
    aboutMe: 'ML engineer with experience building recommendation systems and NLP pipelines at scale.',
    strengths: ['Machine Learning', 'Statistical Analysis', 'Deep Learning'], githubUrl: 'github.com/nehagupta', resumeFile: 'neha_gupta_resume.pdf',
    profileCompletion: 100, freeRequestsRemaining: 2, plan: 'free', avatar: '👩‍🔬'
  },
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp1', role: 'employee', email: 'raj.kumar@shopify.com', name: 'Raj Kumar', phone: '+1-613-555-0401', status: 'active', createdAt: '2025-08-01', verified: true, verificationLevel: 4,
    companyId: 'c1', companyName: 'Shopify', workEmail: 'raj.kumar@shopify.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/rajkumar', linkedinVerified: true, adminApproved: true,
    title: 'Staff Software Engineer', department: 'Core Platform', yearsAtCompany: 4, location: 'Ottawa, ON',
    referralAvailable: true, maxWeeklyReferrals: 3, currentWeeklyReferrals: 1, totalReferrals: 47, acceptanceRate: 82, avgResponseTime: '4 hours',
    bio: 'Staff engineer at Shopify working on core platform infrastructure. Happy to help talented engineers find their place at Shopify.',
    hiringAreas: ['Backend Engineering', 'Platform Engineering', 'DevOps'], preferredCandidateLevel: ['Mid', 'Senior', 'Staff'],
    chatAvailable: true, reputationScore: 96, badges: ['Top Referrer', 'Trusted Connector', 'Quick Responder'], leaderboardRank: 3, avatar: '👨‍💻'
  },
  {
    id: 'emp2', role: 'employee', email: 'anita.singh@amazon.ca', name: 'Anita Singh', phone: '+1-604-555-0502', status: 'active', createdAt: '2025-09-15', verified: true, verificationLevel: 4,
    companyId: 'c2', companyName: 'Amazon Canada', workEmail: 'anitasi@amazon.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/anitasingh', linkedinVerified: true, adminApproved: true,
    title: 'Senior Product Manager', department: 'AWS', yearsAtCompany: 3, location: 'Vancouver, BC',
    referralAvailable: true, maxWeeklyReferrals: 5, currentWeeklyReferrals: 2, totalReferrals: 63, acceptanceRate: 75, avgResponseTime: '6 hours',
    bio: 'Senior PM at AWS. Previously at Google. Passionate about helping talented professionals break into FAANG companies.',
    hiringAreas: ['Product Management', 'Program Management', 'Business Analysis'], preferredCandidateLevel: ['Mid', 'Senior'],
    chatAvailable: true, reputationScore: 94, badges: ['Top Referrer', 'Mentor'], leaderboardRank: 1, avatar: '👩‍💼'
  },
  {
    id: 'emp3', role: 'employee', email: 'vikram.reddy@rbc.com', name: 'Vikram Reddy', phone: '+1-416-555-0603', status: 'active', createdAt: '2025-10-01', verified: true, verificationLevel: 3,
    companyId: 'c3', companyName: 'Royal Bank of Canada', workEmail: 'vikram.reddy@rbc.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/vikramreddy', linkedinVerified: true, adminApproved: true,
    title: 'Director of Engineering', department: 'Digital Banking', yearsAtCompany: 6, location: 'Toronto, ON',
    referralAvailable: true, maxWeeklyReferrals: 2, currentWeeklyReferrals: 0, totalReferrals: 35, acceptanceRate: 88, avgResponseTime: '12 hours',
    bio: 'Leading digital transformation at RBC. 15+ years in fintech. Here to connect great talent with banking opportunities.',
    hiringAreas: ['Software Engineering', 'Data Engineering', 'Cybersecurity'], preferredCandidateLevel: ['Senior', 'Lead', 'Manager'],
    chatAvailable: true, reputationScore: 92, badges: ['Trusted Connector', 'Industry Expert'], leaderboardRank: 5, avatar: '👨‍💼'
  },
  {
    id: 'emp4', role: 'employee', email: 'meera.joshi@google.ca', name: 'Meera Joshi', phone: '+1-519-555-0704', status: 'active', createdAt: '2025-07-20', verified: true, verificationLevel: 4,
    companyId: 'c5', companyName: 'Google Canada', workEmail: 'meeraj@google.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/meerajoshi', linkedinVerified: true, adminApproved: true,
    title: 'Senior Software Engineer', department: 'Cloud AI', yearsAtCompany: 5, location: 'Waterloo, ON',
    referralAvailable: true, maxWeeklyReferrals: 3, currentWeeklyReferrals: 1, totalReferrals: 52, acceptanceRate: 85, avgResponseTime: '3 hours',
    bio: 'Building AI/ML products at Google Cloud. Love to help aspiring engineers and ML researchers join the Google team in Canada.',
    hiringAreas: ['Machine Learning', 'Software Engineering', 'Research'], preferredCandidateLevel: ['Junior', 'Mid', 'Senior'],
    chatAvailable: true, reputationScore: 98, badges: ['Top Referrer', 'Quick Responder', 'Mentor', 'Community Leader'], leaderboardRank: 2, avatar: '👩‍🔬'
  },
  {
    id: 'emp5', role: 'employee', email: 'sanjay.desai@microsoft.com', name: 'Sanjay Desai', phone: '+1-604-555-0805', status: 'active', createdAt: '2025-11-01', verified: true, verificationLevel: 3,
    companyId: 'c6', companyName: 'Microsoft Canada', workEmail: 'sdesai@microsoft.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/sanjaydesai', linkedinVerified: true, adminApproved: true,
    title: 'Principal Engineer', department: 'Azure', yearsAtCompany: 7, location: 'Vancouver, BC',
    referralAvailable: false, maxWeeklyReferrals: 2, currentWeeklyReferrals: 2, totalReferrals: 41, acceptanceRate: 90, avgResponseTime: '8 hours',
    bio: 'Principal Engineer working on Azure infrastructure. Focused on high-quality referrals for cloud and infrastructure roles.',
    hiringAreas: ['Cloud Infrastructure', 'Distributed Systems', 'DevOps'], preferredCandidateLevel: ['Senior', 'Staff', 'Principal'],
    chatAvailable: false, reputationScore: 91, badges: ['Trusted Connector'], leaderboardRank: 7, avatar: '👨‍🔧'
  },
];

export const mockRequests: ReferralRequest[] = [
  {
    id: 'req1', seekerId: 'js1', seekerName: 'Priya Sharma', seekerAvatar: '👩‍💻',
    companyId: 'c1', companyName: 'Shopify', companyLogo: '🟢',
    jobTitle: 'Staff Software Engineer - Platform', jobUrl: 'https://shopify.com/careers/staff-swe-platform', jobLocation: 'Ottawa, ON / Remote',
    resumeFile: 'priya_sharma_resume.pdf', fitSummary: 'I have 7 years of experience building scalable platform infrastructure. At my current role, I designed a microservices architecture handling 10M+ requests/day. I am passionate about Shopify\'s mission of making commerce better.',
    coverNote: 'Hi! I\'ve been following Shopify\'s engineering blog for years and would love to contribute to your platform team.', workAuth: 'Canadian Citizen',
    salaryExpectation: '$160K-$180K', urgency: 'medium', portfolioLinks: ['github.com/priyasharma', 'priyasharma.dev'],
    status: 'matched', submittedAt: '2026-03-15', matchedAt: '2026-03-16',
    priceCharged: 2, paymentStatus: 'paid', matchedEmployeeId: 'emp1', matchedEmployeeName: 'Raj Kumar', matchScore: 94,
    timeline: [
      { date: '2026-03-15 10:00', status: 'submitted', description: 'Request submitted' },
      { date: '2026-03-15 10:05', status: 'under_review', description: 'System reviewing request' },
      { date: '2026-03-15 10:30', status: 'matching', description: 'Finding best employee match' },
      { date: '2026-03-16 08:00', status: 'matched', description: 'Matched with Raj Kumar (94% match)' },
      { date: '2026-03-16 09:15', status: 'accepted', description: 'Raj Kumar accepted your request' },
    ]
  },
  {
    id: 'req2', seekerId: 'js1', seekerName: 'Priya Sharma', seekerAvatar: '👩‍💻',
    companyId: 'c5', companyName: 'Google Canada', companyLogo: '🔍',
    jobTitle: 'Senior Software Engineer - Cloud AI', jobUrl: 'https://google.com/careers/swe-cloud-ai', jobLocation: 'Waterloo, ON',
    resumeFile: 'priya_sharma_resume.pdf', fitSummary: 'My experience with distributed systems and ML infrastructure makes me a strong fit for Google Cloud AI.',
    coverNote: 'Would love an opportunity to work on Google Cloud\'s AI platform team.', workAuth: 'Canadian Citizen',
    urgency: 'high', portfolioLinks: ['github.com/priyasharma'],
    status: 'submitted', submittedAt: '2026-04-01',
    priceCharged: 3, paymentStatus: 'paid',
    timeline: [
      { date: '2026-04-01 14:00', status: 'submitted', description: 'Request submitted' },
      { date: '2026-04-01 14:10', status: 'under_review', description: 'System reviewing request' },
    ]
  },
  {
    id: 'req3', seekerId: 'js2', seekerName: 'Arjun Patel', seekerAvatar: '👨‍💼',
    companyId: 'c2', companyName: 'Amazon Canada', companyLogo: '📦',
    jobTitle: 'Senior Product Manager - AWS', jobUrl: 'https://amazon.jobs/pm-aws-canada', jobLocation: 'Vancouver, BC',
    resumeFile: 'arjun_patel_resume.pdf', fitSummary: 'With my MBA from Rotman and 5 years of PM experience, I bring strong product sense and data-driven decision making to the AWS team.',
    coverNote: 'I have deep experience in B2B SaaS products and cloud platforms.', workAuth: 'Permanent Resident',
    urgency: 'medium', portfolioLinks: [],
    status: 'completed', submittedAt: '2026-02-20', matchedAt: '2026-02-21', completedAt: '2026-03-05',
    priceCharged: 3, paymentStatus: 'paid', matchedEmployeeId: 'emp2', matchedEmployeeName: 'Anita Singh', matchScore: 91,
    timeline: [
      { date: '2026-02-20 09:00', status: 'submitted', description: 'Request submitted' },
      { date: '2026-02-20 09:30', status: 'matching', description: 'Finding best match' },
      { date: '2026-02-21 11:00', status: 'matched', description: 'Matched with Anita Singh' },
      { date: '2026-02-21 14:00', status: 'accepted', description: 'Anita Singh accepted' },
      { date: '2026-03-05 16:00', status: 'completed', description: 'Referral completed successfully!' },
    ]
  },
  {
    id: 'req4', seekerId: 'js3', seekerName: 'Neha Gupta', seekerAvatar: '👩‍🔬',
    companyId: 'c5', companyName: 'Google Canada', companyLogo: '🔍',
    jobTitle: 'Machine Learning Engineer', jobUrl: 'https://google.com/careers/ml-engineer-canada', jobLocation: 'Waterloo, ON / Remote',
    resumeFile: 'neha_gupta_resume.pdf', fitSummary: 'As an M.Sc. graduate from UofT with published ML research and production ML experience, I am well-suited for Google\'s ML engineering team.',
    coverNote: 'My research focus aligns with Google Cloud AI\'s product roadmap.', workAuth: 'Work Permit (PGWP)',
    urgency: 'high', portfolioLinks: ['github.com/nehagupta'],
    status: 'matching', submittedAt: '2026-04-05',
    priceCharged: 0, paymentStatus: 'free',
    timeline: [
      { date: '2026-04-05 15:00', status: 'submitted', description: 'Request submitted' },
      { date: '2026-04-05 15:10', status: 'under_review', description: 'Reviewing request details' },
      { date: '2026-04-05 16:00', status: 'matching', description: 'Finding matching employees...' },
    ]
  },
  {
    id: 'req5', seekerId: 'js2', seekerName: 'Arjun Patel', seekerAvatar: '👨‍💼',
    companyId: 'c6', companyName: 'Microsoft Canada', companyLogo: '🪟',
    jobTitle: 'Product Manager II - Azure', jobUrl: 'https://microsoft.com/careers/pm-azure', jobLocation: 'Vancouver, BC',
    resumeFile: 'arjun_patel_resume.pdf', fitSummary: 'Cloud product experience with strong technical background.',
    coverNote: 'Excited about Azure\'s growth in Canada.', workAuth: 'Permanent Resident',
    urgency: 'low', portfolioLinks: [],
    status: 'declined', submittedAt: '2026-03-01',
    priceCharged: 2, paymentStatus: 'refunded',
    timeline: [
      { date: '2026-03-01 10:00', status: 'submitted', description: 'Request submitted' },
      { date: '2026-03-02 09:00', status: 'matching', description: 'Matching in progress' },
      { date: '2026-03-03 14:00', status: 'declined', description: 'No available referrers at this time' },
      { date: '2026-03-03 14:00', status: 'refunded', description: 'Refund of $2.00 processed' },
    ]
  },
];

export const mockChats: Chat[] = [
  {
    id: 'chat1', requestId: 'req1', employeeId: 'emp1', employeeName: 'Raj Kumar', employeeAvatar: '👨‍💻',
    seekerId: 'js1', seekerName: 'Priya Sharma', seekerAvatar: '👩‍💻',
    status: 'active', lastMessage: 'I\'ve submitted your referral. You should hear from the recruiter within a week!', lastMessageAt: '2026-03-20 14:30', unreadCount: 1,
    messages: [
      { id: 'm1', chatId: 'chat1', senderId: 'emp1', senderName: 'Raj Kumar', senderAvatar: '👨‍💻', body: 'Hi Priya! I reviewed your profile and resume. Very impressive background! I\'d be happy to refer you for the Staff SWE role.', createdAt: '2026-03-16 09:30', read: true },
      { id: 'm2', chatId: 'chat1', senderId: 'js1', senderName: 'Priya Sharma', senderAvatar: '👩‍💻', body: 'Thank you so much, Raj! I really appreciate your willingness to help. Is there anything specific you need from me?', createdAt: '2026-03-16 10:15', read: true },
      { id: 'm3', chatId: 'chat1', senderId: 'emp1', senderName: 'Raj Kumar', senderAvatar: '👨‍💻', body: 'Your resume looks great. I just need your preferred start date and whether you\'re open to Ottawa or only remote.', createdAt: '2026-03-16 11:00', read: true },
      { id: 'm4', chatId: 'chat1', senderId: 'js1', senderName: 'Priya Sharma', senderAvatar: '👩‍💻', body: 'I can start in 2-3 weeks. I\'m open to both Ottawa and remote — flexibility is no issue!', createdAt: '2026-03-16 11:30', read: true },
      { id: 'm5', chatId: 'chat1', senderId: 'emp1', senderName: 'Raj Kumar', senderAvatar: '👨‍💻', body: 'Perfect! I also wanted to share some tips for the Shopify interview process. They focus heavily on system design and cultural contribution.', createdAt: '2026-03-17 09:00', read: true },
      { id: 'm6', chatId: 'chat1', senderId: 'js1', senderName: 'Priya Sharma', senderAvatar: '👩‍💻', body: 'That\'s so helpful! I\'ve been prepping system design but any insider tips are gold. Thank you! 🙏', createdAt: '2026-03-17 09:45', read: true },
      { id: 'm7', chatId: 'chat1', senderId: 'emp1', senderName: 'Raj Kumar', senderAvatar: '👨‍💻', body: 'I\'ve submitted your referral. You should hear from the recruiter within a week!', createdAt: '2026-03-20 14:30', read: false },
    ]
  },
  {
    id: 'chat2', requestId: 'req3', employeeId: 'emp2', employeeName: 'Anita Singh', employeeAvatar: '👩‍💼',
    seekerId: 'js2', seekerName: 'Arjun Patel', seekerAvatar: '👨‍💼',
    status: 'closed', lastMessage: 'Congratulations on the offer, Arjun! 🎉', lastMessageAt: '2026-03-10 16:00', unreadCount: 0,
    messages: [
      { id: 'm8', chatId: 'chat2', senderId: 'emp2', senderName: 'Anita Singh', senderAvatar: '👩‍💼', body: 'Hi Arjun! Your PM experience is exactly what we look for. Let me refer you to the AWS PM team.', createdAt: '2026-02-21 14:30', read: true },
      { id: 'm9', chatId: 'chat2', senderId: 'js2', senderName: 'Arjun Patel', senderAvatar: '👨‍💼', body: 'That\'s wonderful news, Anita! Thank you for taking the time to review my profile.', createdAt: '2026-02-21 15:00', read: true },
      { id: 'm10', chatId: 'chat2', senderId: 'emp2', senderName: 'Anita Singh', senderAvatar: '👩‍💼', body: 'Referral submitted! Pro tip: brush up on the Amazon Leadership Principles — they\'re central to every interview loop.', createdAt: '2026-02-22 10:00', read: true },
      { id: 'm11', chatId: 'chat2', senderId: 'js2', senderName: 'Arjun Patel', senderAvatar: '👨‍💼', body: 'Got the recruiter call! Interview scheduled for next week. Your referral made all the difference!', createdAt: '2026-03-01 09:00', read: true },
      { id: 'm12', chatId: 'chat2', senderId: 'emp2', senderName: 'Anita Singh', senderAvatar: '👩‍💼', body: 'Congratulations on the offer, Arjun! 🎉', createdAt: '2026-03-10 16:00', read: true },
    ]
  },
];

export const mockEvents: EventItem[] = [
  { id: 'ev1', title: 'Tech Professionals Networking Night', description: 'Connect with tech professionals from top Canadian companies. Share experiences, career tips, and build your network in an informal setting.', city: 'Toronto', venue: 'MaRS Discovery District', dateTime: '2026-04-20 18:30', capacity: 150, attendees: 89, hostName: 'IndoCanada Club Toronto', type: 'networking', featured: true, price: 0 },
  { id: 'ev2', title: 'Resume & Interview Workshop', description: 'Learn how to craft a Canadian-style resume and ace your interviews with hiring managers from top companies.', city: 'Vancouver', venue: 'Vancouver Convention Centre', dateTime: '2026-04-25 10:00', capacity: 80, attendees: 52, hostName: 'IndoCanada Club Vancouver', type: 'workshop', featured: true, price: 15 },
  { id: 'ev3', title: 'AMA: Breaking into FAANG in Canada', description: 'Ask Me Anything session with engineers and PMs from Google, Amazon, and Microsoft Canada.', city: 'Online', venue: 'Zoom Webinar', dateTime: '2026-05-02 19:00', capacity: 500, attendees: 234, hostName: 'IndoCanada Club', type: 'ama', featured: true, price: 0 },
  { id: 'ev4', title: 'Finance Professionals Mixer', description: 'Networking event for finance, accounting, and banking professionals in the GTA.', city: 'Toronto', venue: 'The Spoke Club', dateTime: '2026-05-10 18:00', capacity: 100, attendees: 45, hostName: 'IndoCanada Club Finance Chapter', type: 'meetup', featured: false, price: 10 },
  { id: 'ev5', title: 'Newcomers Career Support Circle', description: 'A support group for internationally trained professionals navigating the Canadian job market.', city: 'Calgary', venue: 'Calgary Public Library', dateTime: '2026-05-15 14:00', capacity: 40, attendees: 28, hostName: 'IndoCanada Club Calgary', type: 'meetup', featured: false, price: 0 },
  { id: 'ev6', title: 'Hiring Night: Top Banks Edition', description: 'Meet hiring managers from RBC, TD, Scotiabank, and CIBC. Bring your resume!', city: 'Toronto', venue: 'Beanfield Centre', dateTime: '2026-05-22 17:30', capacity: 200, attendees: 156, hostName: 'IndoCanada Club', type: 'hiring', featured: true, price: 0 },
];

export const mockDiscussions: DiscussionPost[] = [
  { id: 'd1', authorId: 'js1', authorName: 'Priya Sharma', authorAvatar: '👩‍💻', authorRole: 'Job Seeker', category: 'Career Tips', title: 'How I prepared for Shopify\'s system design interview', body: 'Sharing my detailed preparation strategy for the system design round at Shopify. Focus on distributed systems, data modeling, and trade-off analysis...', likes: 127, replies: 34, createdAt: '2026-03-28', pinned: true, tags: ['interview-prep', 'shopify', 'system-design'] },
  { id: 'd2', authorId: 'emp2', authorName: 'Anita Singh', authorAvatar: '👩‍💼', authorRole: 'Employee @ Amazon', category: 'Industry Insights', title: 'What Amazon looks for in PM candidates (insider perspective)', body: 'As someone who has been on both sides of the Amazon interview table, here are the key traits we evaluate...', likes: 245, replies: 67, createdAt: '2026-03-25', pinned: true, tags: ['amazon', 'product-management', 'hiring'] },
  { id: 'd3', authorId: 'js3', authorName: 'Neha Gupta', authorAvatar: '👩‍🔬', authorRole: 'Job Seeker', category: 'Newcomers', title: 'PGWP to PR: My journey as an international student', body: 'Sharing my complete timeline from graduating with an M.Sc. from UofT to getting my PR through Express Entry...', likes: 189, replies: 45, createdAt: '2026-03-20', pinned: false, tags: ['immigration', 'newcomers', 'pr-journey'] },
  { id: 'd4', authorId: 'emp1', authorName: 'Raj Kumar', authorAvatar: '👨‍💻', authorRole: 'Employee @ Shopify', category: 'Tech Talk', title: 'Shopify\'s tech stack in 2026: What you need to know', body: 'An overview of the technologies we use at Shopify and what skills are most in demand right now...', likes: 98, replies: 22, createdAt: '2026-04-01', pinned: false, tags: ['shopify', 'tech-stack', 'engineering'] },
  { id: 'd5', authorId: 'emp4', authorName: 'Meera Joshi', authorAvatar: '👩‍🔬', authorRole: 'Employee @ Google', category: 'Career Tips', title: 'From entry-level to senior at Google: 5-year growth framework', body: 'Breaking down the performance and promotion framework at Google Canada, with actionable advice for each level...', likes: 312, replies: 89, createdAt: '2026-03-18', pinned: true, tags: ['google', 'career-growth', 'promotion'] },
  { id: 'd6', authorId: 'js2', authorName: 'Arjun Patel', authorAvatar: '👨‍💼', authorRole: 'Job Seeker', category: 'Success Stories', title: '🎉 Got an offer at Amazon Canada through IndoCanada Club!', body: 'Just accepted an offer for Senior PM at AWS Vancouver! The referral from Anita was crucial. Here\'s my full story...', likes: 456, replies: 112, createdAt: '2026-03-12', pinned: true, tags: ['success-story', 'amazon', 'referral'] },
];

export const mockNews: NewsArticle[] = [
  { id: 'n1', title: 'Canada Tech Hiring Surge: 15,000+ Roles Open in Q2 2026', excerpt: 'Major Canadian tech companies announce aggressive hiring plans for the spring quarter, with Shopify, Amazon, and Google leading the charge.', body: '', category: 'Hiring News', author: 'IndoCanada Club Editorial', publishedAt: '2026-04-07', readTime: '4 min', featured: true, tags: ['hiring', 'tech', 'jobs'] },
  { id: 'n2', title: 'Express Entry Draw: CRS Score Drops to 470 — What It Means', excerpt: 'The latest Express Entry draw saw the lowest CRS cut-off in 6 months. Here\'s what this means for skilled workers and how to optimize your score.', body: '', category: 'Immigration', author: 'IndoCanada Club Editorial', publishedAt: '2026-04-05', readTime: '5 min', featured: true, tags: ['immigration', 'express-entry', 'pr'] },
  { id: 'n3', title: 'Salary Report 2026: How Much Do Tech Professionals Earn in Canada?', excerpt: 'Our comprehensive salary survey reveals compensation trends across roles, cities, and experience levels in the Canadian tech industry.', body: '', category: 'Salary Trends', author: 'IndoCanada Club Research', publishedAt: '2026-04-02', readTime: '8 min', featured: true, tags: ['salary', 'compensation', 'tech'] },
  { id: 'n4', title: 'Top 10 Companies Hiring International Talent in Canada', excerpt: 'These companies have the most active LMIA and Global Talent Stream programs for international professionals.', body: '', category: 'Hiring News', author: 'IndoCanada Club Editorial', publishedAt: '2026-03-30', readTime: '6 min', featured: false, tags: ['international', 'hiring', 'lmia'] },
  { id: 'n5', title: 'Mastering the Canadian Interview: A Complete Guide', excerpt: 'Canadian interviews differ from those in other countries. Here\'s your complete prep guide, from behavioral questions to cultural fit.', body: '', category: 'Interview Prep', author: 'Career Team', publishedAt: '2026-03-28', readTime: '10 min', featured: false, tags: ['interview', 'preparation', 'guide'] },
  { id: 'n6', title: 'Banking Sector Layoffs: What You Need to Know', excerpt: 'Recent restructuring at major Canadian banks — analysis of which divisions are affected and where new opportunities lie.', body: '', category: 'Industry News', author: 'IndoCanada Club Editorial', publishedAt: '2026-03-25', readTime: '5 min', featured: false, tags: ['banking', 'layoffs', 'restructuring'] },
];

export const mockPricingRules: PricingRule[] = [
  { id: 'pr1', scopeType: 'global', price: 1.00, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 2, active: true },
  { id: 'pr2', scopeType: 'company', scopeId: 'c1', scopeName: 'Shopify', price: 2.00, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 1, active: true },
  { id: 'pr3', scopeType: 'company', scopeId: 'c2', scopeName: 'Amazon Canada', price: 3.00, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 0, active: true },
  { id: 'pr4', scopeType: 'company', scopeId: 'c5', scopeName: 'Google Canada', price: 3.00, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 0, active: true },
  { id: 'pr5', scopeType: 'company', scopeId: 'c3', scopeName: 'Royal Bank of Canada', price: 2.00, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 1, active: true },
  { id: 'pr6', scopeType: 'promo', scopeName: 'WELCOME2026', price: 0, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 5, active: true, startDate: '2026-04-01', endDate: '2026-06-30' },
];

export const mockRequestPolicies: RequestPolicy[] = [
  { id: 'rp1', planType: 'free', dailyLimit: 1, weeklyLimit: 2, monthlyLimit: 2, activeLimit: 1, perCompanyLimit: 1, cooldownDays: 7, active: true },
  { id: 'rp2', planType: 'starter', dailyLimit: 2, weeklyLimit: 5, monthlyLimit: 5, activeLimit: 3, perCompanyLimit: 2, cooldownDays: 3, active: true },
  { id: 'rp3', planType: 'pro', dailyLimit: 5, weeklyLimit: 10, monthlyLimit: 15, activeLimit: 5, perCompanyLimit: 3, cooldownDays: 1, active: true },
  { id: 'rp4', planType: 'elite', dailyLimit: 10, weeklyLimit: 20, monthlyLimit: 30, activeLimit: 10, perCompanyLimit: 5, cooldownDays: 0, active: true },
];

export const mockPayments: Payment[] = [
  { id: 'pay1', userId: 'js1', userName: 'Priya Sharma', requestId: 'req1', amount: 2.00, currency: 'CAD', status: 'completed', transactionRef: 'TXN-2026-001', createdAt: '2026-03-15', method: 'Visa ****4242' },
  { id: 'pay2', userId: 'js1', userName: 'Priya Sharma', requestId: 'req2', amount: 3.00, currency: 'CAD', status: 'completed', transactionRef: 'TXN-2026-002', createdAt: '2026-04-01', method: 'Visa ****4242' },
  { id: 'pay3', userId: 'js2', userName: 'Arjun Patel', requestId: 'req3', amount: 3.00, currency: 'CAD', status: 'completed', transactionRef: 'TXN-2026-003', createdAt: '2026-02-20', method: 'Mastercard ****8888' },
  { id: 'pay4', userId: 'js2', userName: 'Arjun Patel', requestId: 'req5', amount: 2.00, currency: 'CAD', status: 'refunded', transactionRef: 'TXN-2026-004', createdAt: '2026-03-01', method: 'Mastercard ****8888' },
];

export const mockNotifications: Notification[] = [
  { id: 'not1', userId: 'js1', type: 'match', title: 'Referral Matched!', message: 'Your referral request for Shopify has been matched with Raj Kumar.', read: false, createdAt: '2026-03-16 08:00', actionUrl: '/seeker/my-requests' },
  { id: 'not2', userId: 'js1', type: 'chat', title: 'New Message', message: 'Raj Kumar sent you a message about your Shopify referral.', read: false, createdAt: '2026-03-20 14:30', actionUrl: '/seeker/chat' },
  { id: 'not3', userId: 'js1', type: 'event', title: 'Upcoming Event', message: 'Tech Networking Night is happening on April 20th in Toronto!', read: true, createdAt: '2026-04-07 10:00', actionUrl: '/events' },
  { id: 'not4', userId: 'emp1', type: 'request', title: 'New Referral Request', message: 'Priya Sharma has requested a referral for Staff SWE at Shopify.', read: true, createdAt: '2026-03-15 10:30', actionUrl: '/employee/requests' },
  { id: 'not5', userId: 'emp2', type: 'system', title: 'Weekly Summary', message: 'You completed 3 referrals this week. Great job!', read: true, createdAt: '2026-03-14 09:00' },
];

export const mockVerifications: VerificationRecord[] = [
  { id: 'v1', userId: 'js1', userName: 'Priya Sharma', type: 'linkedin', status: 'approved', submittedAt: '2025-11-16', reviewedAt: '2025-11-17' },
  { id: 'v2', userId: 'js1', userName: 'Priya Sharma', type: 'id', status: 'approved', submittedAt: '2025-11-16', reviewedAt: '2025-11-18' },
  { id: 'v3', userId: 'js3', userName: 'Neha Gupta', type: 'linkedin', status: 'approved', submittedAt: '2026-01-11', reviewedAt: '2026-01-12' },
  { id: 'v4', userId: 'emp1', userName: 'Raj Kumar', type: 'work_email', status: 'approved', submittedAt: '2025-08-02', reviewedAt: '2025-08-02' },
  { id: 'v5', userId: 'emp5', userName: 'Sanjay Desai', type: 'work_email', status: 'pending', submittedAt: '2026-04-08' },
  { id: 'v6', userId: 'js2', userName: 'Arjun Patel', type: 'id', status: 'pending', submittedAt: '2026-04-05' },
];

export const mockAdminStats: AdminStats = {
  totalUsers: 2847,
  jobSeekers: 2150,
  approvedEmployees: 485,
  pendingEmployees: 32,
  totalRequests: 4623,
  paidRequests: 3210,
  freeRequests: 1413,
  acceptedRequests: 3890,
  completedReferrals: 2156,
  declines: 445,
  avgResponseTime: '5.2 hours',
  grossRevenue: 8450.00,
  refunds: 324.00,
  conversionRate: 46.7,
  fraudAlerts: 8,
};

export const revenueData = [
  { month: 'Oct', revenue: 420, users: 180 },
  { month: 'Nov', revenue: 680, users: 340 },
  { month: 'Dec', revenue: 890, users: 520 },
  { month: 'Jan', revenue: 1250, users: 780 },
  { month: 'Feb', revenue: 1680, users: 1100 },
  { month: 'Mar', revenue: 2100, users: 1450 },
  { month: 'Apr', revenue: 1430, users: 1680 },
];

export const requestVolumeData = [
  { day: 'Mon', submitted: 32, matched: 28, completed: 18 },
  { day: 'Tue', submitted: 45, matched: 38, completed: 25 },
  { day: 'Wed', submitted: 38, matched: 32, completed: 22 },
  { day: 'Thu', submitted: 52, matched: 45, completed: 30 },
  { day: 'Fri', submitted: 48, matched: 42, completed: 28 },
  { day: 'Sat', submitted: 18, matched: 15, completed: 10 },
  { day: 'Sun', submitted: 12, matched: 10, completed: 6 },
];
