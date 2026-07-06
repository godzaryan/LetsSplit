'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Home, Zap, Users, Droplets, Wifi, Flame, ChevronRight, ChevronLeft, X } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function GroupOnboardingWizard({ onClose }: { onClose: () => void }) {
  useLockBodyScroll();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Basics
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Step 2: Rent & Security
  const [rentEnabled, setRentEnabled] = useState(true);
  const [rentAmount, setRentAmount] = useState('');
  const [rentCycleDate, setRentCycleDate] = useState('01');
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [securityAmount, setSecurityAmount] = useState('');

  // Step 3: Utilities
  const [elecEnabled, setElecEnabled] = useState(true);
  const [elecCycleDate, setElecCycleDate] = useState('05');
  const [waterEnabled, setWaterEnabled] = useState(false);
  const [waterCycleDate, setWaterCycleDate] = useState('05');
  const [wifiEnabled, setWifiEnabled] = useState(false);
  const [wifiAmount, setWifiAmount] = useState('');
  const [wifiCycleDate, setWifiCycleDate] = useState('01');

  // Step 4: Maid
  const [maidEnabled, setMaidEnabled] = useState(false);
  const [maidName, setMaidName] = useState('');
  const [maidSalary, setMaidSalary] = useState('');
  const [maidPaymentType, setMaidPaymentType] = useState('fixed'); // 'fixed' or 'daily'
  const [maidHolidays, setMaidHolidays] = useState('2');
  const [maidStartDate, setMaidStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Step 5: Cylinder
  const [cylinderEnabled, setCylinderEnabled] = useState(false);
  const [cylinderPrice, setCylinderPrice] = useState('');
  const [cylinderStartDate, setCylinderStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Create Group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          currency,
          created_by: user.id,
          labels: ['Rent', 'Utilities', 'Groceries', 'Food', 'Maid', 'Cylinder'],
        })
        .select()
        .single();
      if (groupError) throw groupError;

      const groupId = group.id;
      const todayDate = new Date();
      const currentYMD = todayDate.toISOString().split('T')[0];
      const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];

      // 2. Add Member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'owner', added_by: user.id });
      if (memberError) throw memberError;

      // 3. Create Rent & Security
      const recurringToInsert = [];
      if (rentEnabled && rentAmount) {
        recurringToInsert.push({
          group_id: groupId, name: 'Rent', amount: parseFloat(rentAmount), cycle: 'monthly', start_date: startOfMonth, created_by: user.id
        });
      }
      if (securityEnabled && securityAmount) {
        recurringToInsert.push({
          group_id: groupId, name: 'Security Deposit', amount: parseFloat(securityAmount), cycle: 'one-time', start_date: currentYMD, created_by: user.id
        });
      }

      // 4. Create Utilities
      if (elecEnabled) {
        recurringToInsert.push({
          group_id: groupId, name: 'Electricity Bill', amount: 0, cycle: 'monthly', start_date: startOfMonth, created_by: user.id
        });
      }
      if (waterEnabled) {
        recurringToInsert.push({
          group_id: groupId, name: 'Water Bill', amount: 0, cycle: 'monthly', start_date: startOfMonth, created_by: user.id
        });
      }
      if (wifiEnabled && wifiAmount) {
        recurringToInsert.push({
          group_id: groupId, name: 'WiFi Bill', amount: parseFloat(wifiAmount), cycle: 'monthly', start_date: startOfMonth, created_by: user.id
        });
      }

      if (recurringToInsert.length > 0) {
        const { error: reqErr } = await supabase.from('recurring_expenses').insert(recurringToInsert);
        if (reqErr) throw reqErr;
      }

      // 5. Create Maid
      if (maidEnabled && maidName) {
        const { error: maidErr } = await supabase.from('maids').insert({
          group_id: groupId,
          name: maidName.trim(),
          monthly_salary: parseFloat(maidSalary || '0'),
          allowed_holidays_per_month: parseInt(maidHolidays || '0'),
          payment_type: maidPaymentType,
          joined_date: maidStartDate,
          is_active: true
        });
        if (maidErr) throw maidErr;
      }

      // 6. Create Cylinder
      if (cylinderEnabled) {
        const { error: cylErr } = await supabase.from('cylinders').insert({
          group_id: groupId,
          price: parseFloat(cylinderPrice || '0'),
          start_date: cylinderStartDate,
          added_by: user.id,
          status: 'active'
        });
        if (cylErr) throw cylErr;
      }

      onClose();
      router.push(`/dashboard/group/${groupId}`);
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Failed to setup group');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Flatmate Setup</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Step {step} of 5: {
                step === 1 ? 'The Basics' :
                step === 2 ? 'Rent & Deposit' :
                step === 3 ? 'Utilities' :
                step === 4 ? 'Maid Services' : 'Cooking Gas (Cylinder)'
              }
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        <div style={{ minHeight: '300px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(108, 92, 231, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}><Home size={24} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Create your Flat</h3>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Flat Name</label>
                <input type="text" className="input-field" placeholder="e.g. 302 Bachelors" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>Currency</label>
                <CustomSelect
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { value: 'INR', label: '₹ Indian Rupee', sublabel: 'India' },
                    { value: 'USD', label: '$ US Dollar', sublabel: 'United States' },
                    { value: 'EUR', label: '€ Euro', sublabel: 'European Union' }
                  ]}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(253, 203, 110, 0.1)', borderRadius: '12px', color: '#fdcb6e' }}><Home size={24} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Rent & Security Deposit</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Monthly Rent</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fixed recurring schedule</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={rentEnabled} onChange={(e) => setRentEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {rentEnabled && (
                <div style={{ display: 'flex', gap: '12px', paddingLeft: '16px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Amount</label>
                    <input type="number" className="input-field" placeholder="Total Rent" value={rentAmount} onChange={e => setRentAmount(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Security Deposit</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>One-time collection</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={securityEnabled} onChange={(e) => setSecurityEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {securityEnabled && (
                <div style={{ display: 'flex', gap: '12px', paddingLeft: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Amount</label>
                    <input type="number" className="input-field" placeholder="Deposit Amount" value={securityAmount} onChange={e => setSecurityAmount(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(0, 184, 148, 0.1)', borderRadius: '12px', color: '#00b894' }}><Zap size={24} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Utilities</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>We will remind you when bills are due. Variable bills (like electricity) won't have a fixed amount until you receive the actual bill.</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Zap size={18} color="#fdcb6e" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Electricity (Variable)</div>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={elecEnabled} onChange={(e) => setElecEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Droplets size={18} color="#74b9ff" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Water Bill (Variable)</div>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={waterEnabled} onChange={(e) => setWaterEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wifi size={18} color="#a29bfe" />
                  <div>
                    <div style={{ fontWeight: 600 }}>WiFi / Broadband</div>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={wifiEnabled} onChange={(e) => setWifiEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
                {wifiEnabled && (
                  <div style={{ width: '100%', marginTop: '12px' }}>
                    <input type="number" className="input-field" placeholder="Fixed Monthly Amount" value={wifiAmount} onChange={e => setWifiAmount(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', borderRadius: '12px', color: '#e17055' }}><Users size={24} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Maid Services</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Do you have a maid?</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>You can always add or change maids later.</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={maidEnabled} onChange={(e) => setMaidEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {maidEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Maid Name</label>
                    <input type="text" className="input-field" placeholder="e.g. Sunita" value={maidName} onChange={e => setMaidName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Payment Type</label>
                      <CustomSelect
                        value={maidPaymentType}
                        onChange={setMaidPaymentType}
                        options={[
                          { value: 'fixed', label: 'Fixed Monthly' },
                          { value: 'daily', label: 'Per Day Present' }
                        ]}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Base Salary</label>
                      <input type="number" className="input-field" placeholder="Amount" value={maidSalary} onChange={e => setMaidSalary(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Allowed Holidays (Month)</label>
                      <input type="number" className="input-field" value={maidHolidays} onChange={e => setMaidHolidays(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Joined Date</label>
                      <input type="date" className="input-field" value={maidStartDate} onChange={e => setMaidStartDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(214, 48, 49, 0.1)', borderRadius: '12px', color: '#d63031' }}><Flame size={24} /></div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Cooking Gas (Cylinder)</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Track Cylinder Lifecycle</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Track usage and predict empty dates.</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={cylinderEnabled} onChange={(e) => setCylinderEnabled(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {cylinderEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Cost of current cylinder (Optional)</label>
                    <input type="number" className="input-field" placeholder="e.g. 950" value={cylinderPrice} onChange={e => setCylinderPrice(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Date Started</label>
                    <input type="date" className="input-field" value={cylinderStartDate} onChange={e => setCylinderStartDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,107,107,0.1)', color: 'var(--accent-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={handleBack} disabled={step === 1 || loading} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}>
            <ChevronLeft size={16} /> Back
          </button>
          
          {step < 5 ? (
            <button onClick={handleNext} disabled={step === 1 && !name.trim()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (step === 1 && !name.trim()) ? 0.5 : 1 }}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={loading} className="btn-primary">
              {loading ? 'Creating Flat...' : 'Finish Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
