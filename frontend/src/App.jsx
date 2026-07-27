import { useState } from 'react'
import UnitCircle from './components/UnitCircle'
import Controls from './components/Controls'
import './App.css'

function App() {
  const [angle, setAngle] = useState(45)
  const [showSin, setShowSin] = useState(true)
  const [showCos, setShowCos] = useState(true)
  const [showTan, setShowTan] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [labelsInRadians, setLabelsInRadians] = useState(false)
  const [showCoords, setShowCoords] = useState(true)

  return (
    <div className="app">
      <header>
        <h1>Interactive Unit Circle</h1>
        <p>Drag the point or use the controls</p>
      </header>

      <main>
        <UnitCircle
          angle={angle}
          onAngleChange={setAngle}
          showSin={showSin}
          showCos={showCos}
          showTan={showTan}
          showLabels={showLabels}
          labelsInRadians={labelsInRadians}
          showCoords={showCoords}
        />

        <Controls
          angle={angle}
          onAngleChange={setAngle}
          showSin={showSin}
          setShowSin={setShowSin}
          showCos={showCos}
          setShowCos={setShowCos}
          showTan={showTan}
          setShowTan={setShowTan}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          labelsInRadians={labelsInRadians}
          setLabelsInRadians={setLabelsInRadians}
          showCoords={showCoords}
          setShowCoords={setShowCoords}
        />
      </main>
    </div>
  )
}

export default App