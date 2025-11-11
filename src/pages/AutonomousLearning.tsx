import React from 'react';
import NavigationBar from '@/components/NavigationBar';
import AutonomousLearningDashboard from '@/components/AutonomousLearningDashboard';

const AutonomousLearning: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Autonomous Learning System</h1>
          <p className="text-muted-foreground mt-2">
            Real-time self-learning and self-healing trading intelligence
          </p>
        </div>
        <AutonomousLearningDashboard />
      </div>
    </div>
  );
};

export default AutonomousLearning;
