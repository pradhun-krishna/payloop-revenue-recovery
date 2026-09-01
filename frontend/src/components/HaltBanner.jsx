/**
 * HaltBanner — Full-width red banner shown when batch is halted.
 * Only visible when a fraud spike triggers the batch halt.
 */
export default function HaltBanner({ haltData }) {
  if (!haltData) return null;

  return (
    <div
      className="w-full px-24 py-12 flex items-center gap-12"
      style={{
        backgroundColor: '#FF4D6A14',
        borderBottom: '1px solid #FF4D6A30',
      }}
    >
      <span
        className="w-[8px] h-[8px] rounded-full flex-shrink-0"
        style={{
          backgroundColor: '#FF4D6A',
          boxShadow: '0 0 8px #FF4D6A60',
        }}
      />
      <span className="text-danger text-[14px] font-semibold flex-shrink-0">
        Agent halted
      </span>
      <span className="text-text-secondary text-[13px]">
        {haltData.reason || 'Batch processing has been halted due to anomaly detection.'}
      </span>
    </div>
  );
}
