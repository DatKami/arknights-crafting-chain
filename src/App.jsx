import { useState, useEffect, useRef } from 'react'
import './App.css'
import render from './graph'

let rendered = false

function App() {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current === null || rendered) return
    render()
    rendered = true
  }, [ref.current])

  return (
    <div className="App">
      <canvas id="viewport" ref={ref} width="1700" height="840"/>
    </div>
  )
}

export default App
