'use client';

import { useState } from 'react';
import Header, { type TabKey } from '../components/Header';
import IPv4Calculator from '../components/IPv4Calculator';
import HostsToCidrCalculator from '../components/HostsToCidrCalculator';
import SubnetsToCidrCalculator from '../components/SubnetsToCidrCalculator';
import VLSMCalculator from '../components/VLSMCalculator';
import FLSMCalculator from '../components/FLSMCalculator';
import IPv6Calculator from '../components/IPv6Calculator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('ipv4');

  return (
    <>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {activeTab === 'ipv4' && <IPv4Calculator />}
        {activeTab === 'hostsToCidr' && <HostsToCidrCalculator />}
        {activeTab === 'subnetsToCidr' && <SubnetsToCidrCalculator />}
        {activeTab === 'vlsm' && <VLSMCalculator />}
        {activeTab === 'flsm' && <FLSMCalculator />}
        {activeTab === 'ipv6' && <IPv6Calculator />}
      </main>
    </>
  );
}
