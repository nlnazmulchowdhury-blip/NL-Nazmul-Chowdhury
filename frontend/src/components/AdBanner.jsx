import MyBidAdSlot from './MyBidAdSlot';

export default function AdBanner({ position = 'top', className = '' }) {
  return (
    <div
      className={className}
      style={{
        minHeight: position === 'top' ? '90px' : '120px',
      }}
    >
      <div className="flex justify-center">
        <MyBidAdSlot
          bannerId="2023322"
          className="w-full"
        />
      </div>
    </div>
  );
}
