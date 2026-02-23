import MobileLayout from "@/components/MobileLayout";
import { FileText, Info, Shield, HeartHandshake } from "lucide-react";

function PolicyLayout({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <MobileLayout title={title} showBack>
      <div className="p-6">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
          {icon}
        </div>
        <div className="prose prose-sm prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary max-w-none">
          {children}
        </div>
      </div>
    </MobileLayout>
  );
}

export function About() {
  return (
    <PolicyLayout title="About This App" icon={<Info className="w-6 h-6" />}>
      <h3>RFC MentorConnect</h3>
      <p>Version 1.0 (Prototype)</p>
      <p>
        The RFC Mentor App is designed exclusively for patients of the Rejuvenating Fertility Clinic. 
        Our goal is to connect newly onboarded patients with clinic-assigned graduate patient mentors 
        to provide peer support, emotional guidance, and lived experience throughout the fertility journey.
      </p>
      <p>
        <strong>Features:</strong>
        <ul>
          <li>Secure chat and video/voice calls.</li>
          <li>Guided journey hub with phase-specific resources.</li>
          <li>Clinic-assigned mentorship ensuring safe, vetted connections.</li>
        </ul>
      </p>
      <p>Built as a guided companion to complement, not replace, your clinical care.</p>
    </PolicyLayout>
  );
}

export function PrivacyPolicy() {
  return (
    <PolicyLayout title="Privacy Policy" icon={<Shield className="w-6 h-6" />}>
      <h3>Data Security & HIPAA Awareness</h3>
      <p>
        Your privacy is our priority. While this app facilitates peer connection, we minimize the collection 
        of Protected Health Information (PHI). 
      </p>
      <p>
        <strong>What we share:</strong> Only your assigned mentor can see your first name, basic treatment phase, 
        and the messages you send. Mentors are bound by confidentiality agreements signed with RFC.
      </p>
      <p>
        <strong>Auditing & Safety:</strong> For safety and compliance, chat logs may be monitored or audited by 
        RFC clinic administrators. Do not share sensitive medical records, test results, or financial information 
        in the chat.
      </p>
    </PolicyLayout>
  );
}

export function TermsOfUse() {
  return (
    <PolicyLayout title="Terms of Use" icon={<FileText className="w-6 h-6" />}>
      <h3>Acceptance of Terms</h3>
      <p>
        By using the RFC Mentor App, you agree to these Terms of Use. This service is provided "as is" 
        for emotional and peer support purposes only.
      </p>
      <h3>Not Medical Advice</h3>
      <p>
        Mentors are not medical professionals. Information shared in this app, including Journey Hub resources 
        and mentor chat, should NEVER substitute professional medical advice, diagnosis, or treatment. 
        Always seek the advice of your physician or qualified health provider with any questions you may have 
        regarding a medical condition.
      </p>
    </PolicyLayout>
  );
}

export function CommunityGuidelines() {
  return (
    <PolicyLayout title="Community Guidelines" icon={<HeartHandshake className="w-6 h-6" />}>
      <h3>Guidelines for Mentors & Mentees</h3>
      <p>We strive to create a safe, supportive, and respectful environment for all patients.</p>
      
      <h4>For Mentors:</h4>
      <ul>
        <li><strong>Maintain Boundaries:</strong> Do not offer medical advice, alter protocols, or interpret test results.</li>
        <li><strong>Redirect to Clinic:</strong> When a mentee asks a clinical question, gently redirect them to their RFC nurse or doctor.</li>
        <li><strong>Confidentiality:</strong> Do not discuss your mentee's journey outside of the app or with other patients.</li>
      </ul>

      <h4>For Mentees (Patients):</h4>
      <ul>
        <li><strong>Respect Availability:</strong> Mentors are volunteers. Please respect their response times and avoid late-night non-urgent messages.</li>
        <li><strong>Emergencies:</strong> Never use this app for urgent medical situations. Call 911 or the clinic's emergency line.</li>
      </ul>
    </PolicyLayout>
  );
}