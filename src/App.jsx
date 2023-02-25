import { useState, useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import render from './graph'

let rendered = false

function App() {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current === null || rendered) return
    render()
    rendered = true
  }, [ref.current])

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <canvas id="viewport" ref={ref} width="400" height="400"/>
    </div>
  )
}

export default App