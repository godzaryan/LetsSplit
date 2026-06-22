import React from 'react';

export default function TermsAndConditionsPage() {
  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div className="card animate-fade-in" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Terms and Conditions</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}><strong>Last Updated:</strong> June 22, 2026</p>

        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p>Welcome to <strong>LetsSplit</strong>. Please read these Terms and Conditions carefully. By downloading, accessing, or using the LetsSplit mobile application or website, you agree to be bound by these rules. If you do not agree with any part of these terms, please do not use our services.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>1. What is LetsSplit?</h2>
          <p>LetsSplit is a financial utility tool designed to help you and your friends, family, or colleagues track and calculate shared expenses. We provide a platform for you to log bills, calculate who owes what, and maintain a ledger of your group's financial interactions.</p>
          <p><strong>Important Disclaimer:</strong> LetsSplit is purely a ledger and calculation tool. We are not a bank, a payment processor, or a financial institution. We do not handle actual money transfers, nor do we enforce the collection of debts. The responsibility to actually transfer funds and settle balances lies entirely between you and the other users in your groups.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>2. User Accounts</h2>
          <p>To use most features of LetsSplit, you'll need to create an account.</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Accuracy:</strong> You agree to provide accurate and current information when setting up your account.</li>
            <li><strong>Security:</strong> You are responsible for keeping your password safe. If you suspect someone else has gained access to your account, please notify us immediately.</li>
            <li><strong>Eligibility:</strong> You must be at least 13 years old to use LetsSplit.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>3. Acceptable Use</h2>
          <p>We want LetsSplit to be a helpful and safe environment for everyone. By using the app, you agree that you will not:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Use the app for any illegal or fraudulent activities.</li>
            <li>Harass, threaten, or abuse other users.</li>
            <li>Upload viruses, malicious code, or do anything that could disable, overburden, or impair the proper working of the app.</li>
            <li>Attempt to access data that does not belong to you or groups you have not been invited to.</li>
          </ul>
          <p>We reserve the right to suspend or terminate your account if you violate these rules.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>4. User-Generated Content</h2>
          <p>When you log an expense, add a description, or upload a receipt, you are creating user-generated content.</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>You retain ownership of the data you enter.</li>
            <li>You grant us a license to store, process, and display that content within the app so that your group members can see it and the app can function correctly.</li>
            <li>You are solely responsible for the content you upload. Please do not upload sensitive or highly confidential documents (like full bank statements with routing numbers) into the receipt tracker.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>5. Intellectual Property</h2>
          <p>The LetsSplit app, including its design, codebase, logos, and features, are the property of LetsSplit. You may not copy, modify, distribute, sell, or lease any part of our services or included software without our explicit written permission.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>6. Limitation of Liability</h2>
          <p>We work hard to make sure LetsSplit calculates your expenses perfectly, but software can occasionally have bugs.</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>We provide the app "as is" and "as available," without any warranties of any kind, either express or implied.</li>
            <li>We are not responsible for any financial losses, disputes between group members, or math errors that may result from using the app. Always double-check important calculations before exchanging actual money.</li>
          </ul>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>7. Changes to the App and Terms</h2>
          <p>We are constantly improving LetsSplit. We may add new features, change existing ones, or stop supporting older versions of the app. We also reserve the right to update these Terms and Conditions at any time. If we make material changes, we will notify you through the app. Continuing to use LetsSplit after those changes implies you accept the new terms.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>8. Governing Law</h2>
          <p>These Terms are governed by the laws of your jurisdiction. Any disputes arising from these terms or your use of the app will be resolved in accordance with those laws.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px' }}>9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us!</p>
          <p><strong>Email:</strong> godzaryan@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
