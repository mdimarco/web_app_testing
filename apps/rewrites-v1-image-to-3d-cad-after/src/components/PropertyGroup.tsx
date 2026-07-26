import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  disabledReason?: string;
  right?: ReactNode;
}

export default function PropertyGroup({ title, children, disabledReason, right }: Props) {
  return (
    <div className={`property-group ${disabledReason ? 'disabled' : ''}`}>
      <div className="property-group-title">
        <span className="ui-label">{title}</span>
        {right}
      </div>
      {disabledReason ? <p className="property-group-reason">{disabledReason}</p> : children}
    </div>
  );
}
