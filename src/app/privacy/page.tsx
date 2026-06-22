import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div className="card animate-fade-in" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}><strong>Last Updated:</strong> June 22, 2026</p>

        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p>Welcome to <strong>LetsSplit</strong>! We understand that keeping your financial and personal information safe is a massive priority. We've written this privacy policy to be as clear and straightforward as possible so you know exactly what information we collect, why we collect it, and how we protect it when you use our app and services.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>1. Information We Collect</h2>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Account Details:</strong> When you sign up, we collect your email address, a display name, and your password. We need this to set up your account and let you log in securely.</li>
            <li><strong>Expense & Group Data:</strong> The core of our app is tracking shared expenses. We store the groups you create, the expenses you log (including amounts, descriptions, and dates), and how you choose to split those expenses. This data is essential for the app to function.</li>
            <li><strong>Receipt Images:</strong> If you choose to upload a photo of a receipt for an expense, we store that image so you and your group members can view it later.</li>
            <li><strong>Basic Device Information:</strong> We automatically collect some basic, non-personally identifiable technical information (like your device model, operating system version, and general crash logs) to help us troubleshoot bugs and improve the app's performance.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>2. How We Use Your Information</h2>
          <p>We don't collect data just for the sake of it. Here’s exactly what we do with the information you entrust to us:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>To run the app:</strong> We use your data to calculate balances, sync expenses across your group members, and provide the core functionality of LetsSplit.</li>
            <li><strong>To keep you informed:</strong> We may use your email to send you important updates about your account (like a password reset link) or major changes to our services. We won't spam you.</li>
            <li><strong>To improve the experience:</strong> Crash logs and basic usage analytics help our developers figure out what’s working, what’s broken, and how we can make the app faster and more reliable.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>3. How We Share Your Information</h2>
          <p>Let's be incredibly clear: <strong>We do not sell your personal data to third parties. Ever.</strong></p>
          <p>The only time your information is shared is within the context of the app itself. When you join a group, your display name and the expenses you log or participate in are visible to the other members of that specific group. Outside of your groups, your financial data is completely private.</p>
          <p>We may use trusted third-party services (like secure cloud hosting providers) to store and process our data. These providers are bound by strict confidentiality agreements and are only permitted to use your data to help us run LetsSplit.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>4. Data Security</h2>
          <p>We take your security very seriously. All data sent between your device and our servers is encrypted in transit using industry-standard protocols (HTTPS/TLS). Your passwords are securely hashed and never stored in plain text. While no system is 100% immune to breaches, we employ strict security measures to protect your account and financial data from unauthorized access.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>5. Your Rights and Data Deletion</h2>
          <p>You own your data. You have the right to:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Access it:</strong> You can view all your expenses and account details within the app at any time.</li>
            <li><strong>Correct it:</strong> You can update your profile and edit your expenses.</li>
            <li><strong>Delete it:</strong> You can request the complete deletion of your account and all associated personal data. To do this, please contact us at our support email, and we will securely wipe your data from our active servers.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>6. Children's Privacy</h2>
          <p>LetsSplit is designed for a general audience and is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected data from a child under 13, we will take immediate steps to delete it.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>7. Changes to This Policy</h2>
          <p>As we add new features to LetsSplit, we might need to update this policy. If we make any significant changes, we will notify you within the app or via email so you're always in the loop.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>8. Contact Us</h2>
          <p>If you have any questions, concerns, or just want to chat about how we handle your privacy, please don't hesitate to reach out. We're here to help!</p>
          <p><strong>Email:</strong> support@letssplit.com</p>
        </div>
      </div>
    </div>
  );
}
