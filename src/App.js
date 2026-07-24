import React, { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, Outlines , Hud } from '@react-three/drei'

function Build({ gridSize, currentBlock, currentBuild, setBuilds }) {
    const [blocks, setBlocks] = useState(currentBuild.blocks)
    const grid = Array.from(
        { length: gridSize * gridSize }, 
        (square, index) => (
            {pos: [-Math.floor(gridSize / 2 - 0.5) + (index % gridSize), 0, 
                -Math.floor(gridSize / 2 - 0.5) + (Math.floor(index / gridSize))]}
        ))

    const [numOfBlocks, setNumOfBlocks] = useState(0)
    const [mouseState, setMouseState] = useState(0)
    
    function handleMouseState(button) {
        // console.log(button)
        setMouseState(button)
    }

    function handleAction(pos, action) {
        let newBlocks = blocks.slice()

        if (action === 0) {
            for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].pos[0] === pos[0] && 
                    blocks[i].pos[1] === pos[1] && 
                    blocks[i].pos[2] == pos[2]) {

                    newBlocks = blocks.toSpliced(i, 1)
                    break
                }
            }
        } else if (action === 2) {
            for (const block of blocks) {
                if ((block.pos[0] === pos[0] && 
                    block.pos[1] === pos[1] && 
                    block.pos[2] == pos[2]) || 
                    (pos[0] < -(gridSize / 2 - 0.5) ||
                    pos[0] > (gridSize / 2) ||
                    pos[2] < -(gridSize / 2 - 0.5) ||
                    pos[2] > (gridSize / 2))) {

                    return
                }
            }
            newBlocks = [...blocks.slice(), {pos: pos, type: currentBlock}]
        }

        setBlocks(newBlocks)
        setBuilds(currentBuild.id, newBlocks)
        setNumOfBlocks(newBlocks.length)

        // console.log(newBlocks)
    }

    useFrame((state, delta) => {
        state.events.update()
    })

    return (
        <>
            <group>
                {
                    blocks.map((block, i) => (
                        <Cube 
                            key={i}
                            position={block.pos} 
                            type={block.type} 
                            grid={false} 
                            mouseState={mouseState} 
                            onAction={(pos, type, action) => handleAction(pos, type, action)} 
                            onMouseStateChange={(button) => handleMouseState(button)} />
                    ))
                }
            </group>
            <group>
                {
                    grid.map((cell, i) => (
                        <Cube 
                            key={i}
                            position={cell.pos} 
                            type='dimgray' 
                            grid={true} 
                            mouseState={mouseState} 
                            onAction={(pos, type, action) => handleAction(pos, type, action)} 
                            onMouseStateChange={(button) => handleMouseState(button)} />
                    ))
                }
            </group>
        </>
    )
}

function Cube({ position, type, grid, mouseState, onAction, onMouseStateChange}) {
    const cubeRef = useRef()
    const cubePos = position
    const [currentFaceNorm, setCurrentFaceNorm] = useState(null)

    const getFacePos = (mult) => {
        return [
            cubePos[0] + currentFaceNorm.x * mult,
            cubePos[1] + currentFaceNorm.y * mult,
            cubePos[2] + currentFaceNorm.z * mult,
        ]
    }

    const getFaceRot = () => {
        if (currentFaceNorm.x !== 0) return [0, Math.PI / 2, 0]
        if (currentFaceNorm.y !== 0) return [Math.PI / 2, 0, 0]
        return [0, 0, 0]
    }

    function handlePointerMove(event) {
        event.stopPropagation()
        setCurrentFaceNorm(event.face.normal)
    }

    function handlePointerClick(event, drag=false) {
        handlePointerMove(event)
        if (currentFaceNorm && (!grid || (grid && (drag ? mouseState : event.button) === 2))) { 
            onAction(((drag ? mouseState : event.button) === 2 ? ((grid && currentFaceNorm.y < 0) ? cubePos : getFacePos(1)) : cubePos), (drag ? event.buttons : event.button)) 
            setCurrentFaceNorm(null)
        }
    }

    return (
        <>
            <mesh 
                ref={cubeRef} 
                position={grid ? [position[0], position[1] + 0.5, position[2]] : position}
                scale={1}
                onPointerDown={ 
                    (event) => {
                        onMouseStateChange(event.button === 0 ? 1 : (event.button === 2) ? 2 : 0) 
                        handlePointerClick(event) 
                    }}
                onPointerUp={ (event) => onMouseStateChange(0) }
                onPointerOver={ 
                    (event) => {
                        console.log(mouseState >= 1)
                        if (mouseState >= 1) { handlePointerClick(event, true) } 
                        else { handlePointerMove(event) }
                    }}
                onPointerMove={ (event) => handlePointerMove(event) }
                onPointerOut={ (event) => setCurrentFaceNorm(null) }>
                    <boxGeometry args={grid ? [0.95, 0.05, 0.95] : [1, 1, 1]} />
                    <meshStandardMaterial color={type} />
            </mesh>
            { currentFaceNorm && (
                <Outline position={grid ? [cubePos[0], cubePos[1] + 0.5, cubePos[2]] : getFacePos(0.50375)} rotation={grid ? [Math.PI / 2, 0, 0] : getFaceRot()}/>
            )}
        </>
    );
}

function Outline({ position, rotation }) {
    return (
        <group position={ position} rotation={ rotation }>
            <mesh
                position={[-0.5, 0, 0]}
                rotation={[0, 0, 0]}>
                <boxGeometry args={[0.075, 1.075, 0.075]} />
                <meshBasicMaterial color='white' />
            </mesh>
            <mesh
                position={[0.5, 0, 0]}
                rotation={[0, 0, 0]}>
                <boxGeometry args={[0.075, 1.075, 0.075]} />
                <meshBasicMaterial color='white' />
            </mesh>
            <mesh
                position={[0, -0.5, 0]}
                rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.075, 1.075, 0.075]} />
                <meshBasicMaterial color='white' />
            </mesh>
            <mesh
                position={[0, 0.5, 0]}
                rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.075, 1.075, 0.075]} />
                <meshBasicMaterial color='white' />
            </mesh>
        </group>
    )
}

function BuildMenu({ currentBuildID, onBuildSelect }) {
    const { viewport } = useThree()
    const startXPos = -10
    const startYPos = 6

    return (
        <group position={[startXPos, startYPos, 0]}>
            <BuildIcon id='0' type='orange' index={0} onBuildSelect={(id) => onBuildSelect(id)} currentBuildID={currentBuildID} />
            <BuildIcon id='1' type='white' index={1} onBuildSelect={(id) => onBuildSelect(id)} currentBuildID={currentBuildID} />
            <BuildIcon id='2' type='pink' index={2} onBuildSelect={(id) => onBuildSelect(id)} currentBuildID={currentBuildID} />
        </group>
    )
}

function BuildIcon({ id, type, index, onBuildSelect, currentBuildID }) {
    const spacing = 2.0;
    const [hovered, setHovered] = useState(false)
    const selected = currentBuildID === id
    
    return (
        <mesh
            position={[(index % 3) * spacing, -(Math.floor(index / 3) * spacing), 0]}
            rotation={[Math.PI / 4, Math.PI / 4, 0]}
            onPointerDown={ (event) => {
                event.stopPropagation() 
                onBuildSelect(id) }}
            onPointerOver={ () => setHovered(true) }
            onPointerOut={ () => setHovered(false) }>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={type} />
            { hovered && (
                <Outlines thickness={5} color='white' />
            )}
            { !hovered && selected && (
                <Outlines thickness={5} color='white' />
            )}
        </mesh>
    )

}

function Palette({ currentBlock, onBlockSelect }) {
    const { viewport } = useThree()
    const startXPos = 9
    const startYPos = 6

    return (
        <group position={[startXPos, startYPos, 0]}>
            <Block type='red' index={0} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='orange' index={1} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='yellow' index={2} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='green' index={3} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='blue' index={4} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='purple' index={5} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='gray' index={6} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='lightgray' index={7} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
            <Block type='white' index={8} onBlockSelect={onBlockSelect} currentBlock={currentBlock} />
        </group>
    )
}

function Block({ type, index, onBlockSelect, currentBlock }) {
    const spacing = 2.0;
    const [hovered, setHovered] = useState(false)
    const selected = currentBlock === type
    
    return (
        <mesh
            position={[(index % 3) * spacing, -(Math.floor(index / 3) * spacing), 0]}
            rotation={[Math.PI / 4, Math.PI / 4, 0]}
            onPointerDown={ (event) => onBlockSelect(type, event.button) }
            onPointerOver={ () => setHovered(true) }
            onPointerOut={ () => setHovered(false) }>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={type} />
            { hovered && (
                <Outlines thickness={5} color='white' />
            )}
            { !hovered && selected && (
                <Outlines thickness={5} color='white' />
            )}
        </mesh>
    )

}

function BigHUD({ currentBlock, onBlockSelect, currentBuildID, onBuildSelect }) {
    return (
        <Hud>
            <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 5, 10]} intensity={1} />
            
            <BuildMenu currentBuildID={currentBuildID} onBuildSelect={onBuildSelect} />
            <Palette currentBlock={currentBlock} onBlockSelect={onBlockSelect} />
        </Hud>
    )
}

export default function App() {
    const gridSize = 8;

    const [currentBlock, setCurrentBlock] = useState('white')
    
    const [builds, setBuilds] = useState([
        {id: '0', blocks: [], version: 0}, 
        {id: '1', blocks: [], version: 0}, 
        {id: '2', blocks: [], version: 0} 
    ])
    const [currentBuildID, selectBuildID] = useState('0')
    const currentBuild = builds.find((build) => 
        build.id === currentBuildID) || builds[0]
    const currentVersion = currentBuild.version

    function selectBlock(type, button) {
        if (button === 0) {
            setCurrentBlock(type)
        } else if (button === 2 && type !== currentBlock) {
            const newBlocks = currentBuild.blocks.map((block) => 
                (block.type === currentBlock) ? {...block, type: type} : block)
            
            //console.log(newBlocks)
            updateBuilds(currentBuild.id, newBlocks)
        }
    }

    function updateBuilds(id, blocks) {
        setBuilds((builds) => builds.map((build) => 
            (build.id === id) ? {...build, blocks: blocks, version: build.version + 1} : build))
    }

    async function sendData(data) {
        try {
            const res = await fetch('/api/build', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({data: data}), 
            })

            const response = await res.json()
            console.log(response)

        } catch (error) {
            console.error("Error sending request: ", error)
        }
    }

    return (
        <div style={{width:'100vw', height:'100vh', background:'black'}}>
            <Canvas camera={{position: [0, 8, 8]}}>
                <ambientLight intensity={0.35} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <Build 
                    key={`${currentBuildID}-${currentVersion}`}
                    gridSize={gridSize}
                    currentBlock={currentBlock} 
                    currentBuild={currentBuild} 
                    setBuilds={(id, blocks) => updateBuilds(id, blocks)} />
                <OrbitControls enableZoom={true} />
                <BigHUD 
                    currentBlock={currentBlock} 
                    onBlockSelect={(type, button) => selectBlock(type, button)} 
                    currentBuildID={currentBuildID} 
                    onBuildSelect={(id) => {
                        sendData(currentBuild)
                        selectBuildID(id)} } />            
            </Canvas>
        </div>
    )
}