/* Full-size published-site preview — renders the themed engine as guests see it. */
const { useState: useLpState } = React;

function LivePreviewApp() {
  const [active, setActive] = useLpState(null);
  const [hover, setHover] = useLpState(null);
  const theme = getTheme('santorini');
  return (
    <div className="pl-site" style={{ maxWidth: 1080, margin: '0 auto', boxShadow: '0 30px 80px rgba(40,40,30,0.18)' }}>
      <ThemedSite
        active={active} hover={hover} setActive={setActive} setHover={setHover}
        editable={false}
        theme={theme}
        density="comfortable"
        textureIntensity={1}
        motifsOn={true}
        voice="classic"
        layouts={{}}
        palette={null}
        photosOn={false}
        eventId="wedding"
        siteLayout="stacked"
        kitId="plate"
        decor={{}}
      />
      {typeof RsvpFlow !== 'undefined' && <RsvpFlow/>}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<LivePreviewApp/>);
