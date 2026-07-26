import { useMemo, useRef } from 'react';
import { useDocStore } from '../store/useDocStore';
import PropertyGroup from './PropertyGroup';
import SliderControl from './SliderControl';
import ToggleControl from './ToggleControl';
import NumberField from './NumberField';

export default function RightPanel() {
  const image = useDocStore((s) => s.image);
  const rightPanelOpen = useDocStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useDocStore((s) => s.setRightPanelOpen);

  const threshold = useDocStore((s) => s.thresholdParams);
  const contour = useDocStore((s) => s.contourParams);
  const solid = useDocStore((s) => s.solidParams);
  const contourInfo = useDocStore((s) => s.contourInfo);
  const geometry = useDocStore((s) => s.geometry);

  const beginEdit = useDocStore((s) => s.beginEdit);
  const commitEdit = useDocStore((s) => s.commitEdit);
  const updateThreshold = useDocStore((s) => s.updateThreshold);
  const updateContour = useDocStore((s) => s.updateContour);
  const updateSolid = useDocStore((s) => s.updateSolid);
  const loadImageFile = useDocStore((s) => s.loadImageFile);
  const setExportDialogOpen = useDocStore((s) => s.setExportDialogOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbUrl = useMemo(() => (image ? image.canvas.toDataURL('image/png') : null), [image]);

  const reason = 'Load an image to edit these settings';
  const disabled = !image;

  return (
    <>
      {rightPanelOpen && <div className="panel-scrim" onClick={() => setRightPanelOpen(false)} />}
      <aside className={`right-panel ${rightPanelOpen ? 'open' : ''}`} aria-label="Properties">
        <div className="sheet-handle" />

        <PropertyGroup title="Source" disabledReason={disabled ? reason : undefined}>
          {image && (
            <>
              <div className="thumb-source">{thumbUrl && <img src={thumbUrl} alt="Source thumbnail" />}</div>
              <p className="helper-text">
                {image.info.width}×{image.info.height}px
                {image.info.downsampled && ` (downsampled from ${image.info.originalWidth}×${image.info.originalHeight}px for tracing)`}
                <br />
                {image.info.name} · {(image.info.sizeBytes / 1024).toFixed(0)} KB
              </p>
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => fileInputRef.current?.click()}>
                Replace image…
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files && loadImageFile(e.target.files[0])} />
            </>
          )}
        </PropertyGroup>

        <PropertyGroup title="Threshold" disabledReason={disabled ? reason : undefined}>
          <SliderControl
            label="Threshold"
            value={threshold.threshold}
            min={0}
            max={255}
            step={1}
            precision={0}
            onBeginEdit={beginEdit}
            onLiveChange={(v) => updateThreshold({ threshold: Math.round(v) })}
            onCommit={(v) => {
              updateThreshold({ threshold: Math.round(v) });
              commitEdit();
            }}
          />
          <ToggleControl
            label="Invert"
            value={threshold.invert}
            onChange={(v) => {
              beginEdit();
              updateThreshold({ invert: v });
              commitEdit();
            }}
          />
          <SliderControl
            label="Min island area"
            value={threshold.minIslandArea}
            min={0}
            max={2000}
            step={1}
            unit="px²"
            precision={0}
            onBeginEdit={beginEdit}
            onLiveChange={(v) => updateThreshold({ minIslandArea: Math.round(v) })}
            onCommit={(v) => {
              updateThreshold({ minIslandArea: Math.round(v) });
              commitEdit();
            }}
          />
        </PropertyGroup>

        <PropertyGroup title="Contours" disabledReason={disabled ? reason : undefined}>
          <SliderControl
            label="Simplify tolerance"
            value={contour.simplifyTolerance}
            min={0}
            max={4}
            step={0.1}
            unit="px"
            precision={1}
            onBeginEdit={beginEdit}
            onLiveChange={(v) => updateContour({ simplifyTolerance: v })}
            onCommit={(v) => {
              updateContour({ simplifyTolerance: v });
              commitEdit();
            }}
          />
          <SliderControl
            label="Smoothing"
            value={contour.smoothing}
            min={0}
            max={1}
            step={0.05}
            precision={2}
            onBeginEdit={beginEdit}
            onLiveChange={(v) => updateContour({ smoothing: v })}
            onCommit={(v) => {
              updateContour({ smoothing: v });
              commitEdit();
            }}
          />
          {contourInfo && (
            <p className="helper-text mono" style={{ marginTop: 4 }}>
              {contourInfo.islandsTotal > 0
                ? contourInfo.islandsFiltered > 0
                  ? `${contourInfo.islandsTotal.toLocaleString('en-US')} regions — ${contourInfo.islandsFiltered.toLocaleString('en-US')} below minimum area, filtered`
                  : `${contourInfo.loopCount} loop${contourInfo.loopCount === 1 ? '' : 's'} detected`
                : '0 regions detected'}
            </p>
          )}
        </PropertyGroup>

        <PropertyGroup title="Solid" disabledReason={disabled ? reason : undefined}>
          <div className="field-row">
            <span className="field-label">Target width</span>
            <NumberField
              value={solid.targetWidthMm}
              unit="mm"
              min={1}
              max={2000}
              step={0.5}
              precision={1}
              onBeginEdit={beginEdit}
              onLiveChange={(v) => updateSolid({ targetWidthMm: v })}
              onCommit={(v) => {
                updateSolid({ targetWidthMm: v });
                commitEdit();
              }}
              ariaLabel="Target width"
            />
          </div>
          <div className="field-row">
            <span className="field-label">Extrude depth</span>
            <NumberField
              value={solid.extrudeDepthMm}
              unit="mm"
              min={0.2}
              max={500}
              step={0.2}
              precision={1}
              onBeginEdit={beginEdit}
              onLiveChange={(v) => updateSolid({ extrudeDepthMm: v })}
              onCommit={(v) => {
                updateSolid({ extrudeDepthMm: v });
                commitEdit();
              }}
              ariaLabel="Extrude depth"
            />
          </div>
          <div className="field-row">
            <span className="field-label">Bevel</span>
            <NumberField
              value={solid.bevelMm}
              unit="mm"
              min={0}
              max={20}
              step={0.05}
              precision={2}
              onBeginEdit={beginEdit}
              onLiveChange={(v) => updateSolid({ bevelMm: v })}
              onCommit={(v) => {
                updateSolid({ bevelMm: v });
                commitEdit();
              }}
              ariaLabel="Bevel"
            />
          </div>
          <ToggleControl
            label="Two-sided (centre on plane)"
            value={solid.twoSided}
            onChange={(v) => {
              beginEdit();
              updateSolid({ twoSided: v });
              commitEdit();
            }}
          />
        </PropertyGroup>

        <PropertyGroup title="Export" disabledReason={disabled ? reason : undefined}>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={!geometry} onClick={() => setExportDialogOpen(true)}>
            Export solid…
          </button>
          <p className="export-disclosure" style={{ borderTop: 'none', marginTop: 10, paddingTop: 0 }}>
            <strong>Mesh solid (triangles), not a parametric CAD body</strong> — STEP/BREP unsupported.
          </p>
        </PropertyGroup>
      </aside>
    </>
  );
}
