export type UserRole = 'seeker' | 'employee' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  verified: boolean;
  verificationLevel: number;
}

export interface JobSeeker extends User {
  role: 'seeker';
  linkedinUrl?: string;
  city: string;
  province: string;
  country: string;
  workAuth: string;
  openToRelocation: boolean;
  employmentStatus: string;
  currentTitle: string;
  yearsExperience: number;
  industry: string;
  skills: string[];
  education: string;
  certifications: string[];
  targetRoles: string[];
  targetCompanies: string[];
  salaryRange: string;
  preferredLocations: string[];
  seniorityLevel: string;
  aboutMe: string;
  strengths: string[];
  portfolioUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  resumeFile?: string;
  profileCompletion: number;
  freeRequestsRemaining: number;
  plan: 'free' | 'starter' | 'pro' | 'elite';
}

export interface Employee extends User {
  role: 'employee';
  companyId: string;
  companyName: string;
  workEmail: string;
  workEmailVerified: boolean;
  linkedinUrl: string;
  linkedinVerified: boolean;
  adminApproved: boolean;
  title: string;
  department: string;
  yearsAtCompany: number;
  location: string;
  referralAvailable: boolean;
  maxWeeklyReferrals: number;
  currentWeeklyReferrals: number;
  totalReferrals: number;
  acceptanceRate: number;
  avgResponseTime: string;
  bio: string;
  hiringAreas: string[];
  preferredCandidateLevel: string[];
  chatAvailable: boolean;
  reputationScore: number;
  badges: string[];
  leaderboardRank: number;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  domain: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  openRoles: number;
  activeReferrers: number;
  pricingTier: 'free' | 'standard' | 'premium';
  pricePerRequest: number;
  active: boolean;
  featured: boolean;
  color: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  jobUrl: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  postedDate: string;
  active: boolean;
}

export type RequestStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'queued' 
  | 'matching' 
  | 'matched' 
  | 'accepted' 
  | 'declined' 
  | 'expired' 
  | 'completed' 
  | 'cancelled' 
  | 'refunded';

export interface ReferralRequest {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerAvatar?: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  jobId?: string;
  jobTitle: string;
  jobUrl: string;
  jobLocation: string;
  resumeFile: string;
  fitSummary: string;
  coverNote: string;
  workAuth: string;
  salaryExpectation?: string;
  urgency: 'low' | 'medium' | 'high';
  portfolioLinks: string[];
  status: RequestStatus;
  submittedAt: string;
  matchedAt?: string;
  completedAt?: string;
  priceCharged: number;
  paymentStatus: 'free' | 'paid' | 'refunded' | 'pending';
  matchedEmployeeId?: string;
  matchedEmployeeName?: string;
  matchScore?: number;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  date: string;
  status: string;
  description: string;
}

export interface Match {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  matchScore: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  acceptedAt?: string;
  declinedAt?: string;
}

export interface Chat {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  seekerId: string;
  seekerName: string;
  seekerAvatar?: string;
  status: 'active' | 'closed';
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  body: string;
  attachment?: string;
  createdAt: string;
  read: boolean;
}

export interface PricingRule {
  id: string;
  scopeType: 'global' | 'company' | 'plan' | 'user' | 'promo';
  scopeId?: string;
  scopeName?: string;
  price: number;
  currency: string;
  chargeEvent: 'on_submit' | 'on_match' | 'on_accept';
  freeRequests: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface RequestPolicy {
  id: string;
  planType: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  activeLimit: number;
  perCompanyLimit: number;
  cooldownDays: number;
  active: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  requestId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  transactionRef: string;
  createdAt: string;
  method: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  city: string;
  venue: string;
  dateTime: string;
  capacity: number;
  attendees: number;
  hostName: string;
  type: 'meetup' | 'networking' | 'workshop' | 'ama' | 'hiring';
  featured: boolean;
  image?: string;
  price: number;
}

export interface DiscussionPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  category: string;
  title: string;
  body: string;
  likes: number;
  replies: number;
  createdAt: string;
  pinned: boolean;
  tags: string[];
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  publishedAt: string;
  image?: string;
  readTime: string;
  featured: boolean;
  tags: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'request' | 'match' | 'chat' | 'system' | 'event' | 'payment';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'email' | 'phone' | 'linkedin' | 'id' | 'work_email';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  notes?: string;
}

export interface AdminStats {
  totalUsers: number;
  jobSeekers: number;
  approvedEmployees: number;
  pendingEmployees: number;
  totalRequests: number;
  paidRequests: number;
  freeRequests: number;
  acceptedRequests: number;
  completedReferrals: number;
  declines: number;
  avgResponseTime: string;
  grossRevenue: number;
  refunds: number;
  conversionRate: number;
  fraudAlerts: number;
}
