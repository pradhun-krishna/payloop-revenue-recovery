import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-border p-12 rounded shadow-lg text-[12px]">
        <p className="text-text-primary font-medium mb-[8px]">Transaction Batch {label}</p>
        <div className="space-y-[4px]">
          <p className="text-danger">
            At Risk: ₹{(payload[0].value).toLocaleString()}
          </p>
          <p className="text-success">
            Recovered: ₹{(payload[1].value).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ transactions = [] }) {
  // Dynamically build data chunks from the live transaction feed
  const chartData = useMemo(() => {
    if (transactions.length === 0) {
      // Empty state before agent starts
      return Array.from({ length: 10 }).map((_, i) => ({
        name: `${i * 20}`,
        atRisk: 0,
        recovered: 0,
      }));
    }

    const chunkSize = 20;
    const chunks = [];
    let currentAtRisk = 0;
    let currentRecovered = 0;

    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);
      let chunkRisk = 0;
      let chunkRec = 0;

      chunk.forEach(t => {
        chunkRisk += t.amount_inr || 0;
        if (t.action_result === 'success') {
          chunkRec += t.amount_inr || 0;
        }
      });

      currentAtRisk += chunkRisk;
      currentRecovered += chunkRec;

      chunks.push({
        name: `${i + chunkSize}`,
        atRisk: currentAtRisk,
        recovered: currentRecovered,
      });
    }

    // Pad with empty remaining chunks so the graph fills out left-to-right
    while (chunks.length < 10) {
      chunks.push({
        name: `${chunks.length * 20}`,
        atRisk: currentAtRisk,
        recovered: currentRecovered,
      });
    }

    return chunks;
  }, [transactions]);

  const totalRecovered = chartData[chartData.length - 1]?.recovered || 0;

  return (
    <div className="bg-bg-surface border border-border rounded-card p-16 mb-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
      
      <div className="flex justify-between items-end mb-24 relative z-10">
        <div>
          <h2 className="text-text-primary text-[16px] font-medium tracking-tight">Live Revenue Recovery</h2>
          <p className="text-text-tertiary text-[12px] mt-[4px]">Real-time tracking of current batch</p>
        </div>
        <div className="text-right">
          <div className="text-[24px] font-semibold text-success tabular-nums transition-all duration-300">
            ₹{totalRecovered.toLocaleString()}
          </div>
          <div className="text-text-secondary text-[11px] uppercase tracking-wider font-medium">
            Total Recovered
          </div>
        </div>
      </div>

      <div className="h-[200px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF4D6A" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF4D6A" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3149" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#8B90A7" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#8B90A7" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              isAnimationActive={false}
              type="monotone" 
              dataKey="atRisk" 
              stroke="#FF4D6A" 
              fillOpacity={1} 
              fill="url(#colorAtRisk)" 
              strokeWidth={2}
            />
            <Area 
              isAnimationActive={false}
              type="monotone" 
              dataKey="recovered" 
              stroke="#00E676" 
              fillOpacity={1} 
              fill="url(#colorRecovered)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
