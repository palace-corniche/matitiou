import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import AutonomousLearningDashboard from '@/components/AutonomousLearningDashboard';
import { GraduationCap } from 'lucide-react';

const AutonomousLearning: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Autonomous Learning System"
        description="Real-time self-learning and self-healing trading intelligence with adaptive algorithms"
        icon={GraduationCap}
      />
      <div className="container mx-auto px-6 py-6">
        <AutonomousLearningDashboard />
      </div>
    </>
  );
};

export default AutonomousLearning;
