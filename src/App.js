import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, Outlines , Hud } from '@react-three/drei'
import { supabase } from './utils/supabase'

function Build({ editing, gridSize, currentBlock, currentBuild, setBuilds }) {
    const [blocks, setBlocks] = useState(currentBuild.blocks)
    const grid = Array.from(
        { length: gridSize * gridSize }, 
        (square, index) => (
            {pos: [-Math.floor(gridSize / 2 - 0.5) + (index % gridSize), 0, 
                -Math.floor(gridSize / 2 - 0.5) + (Math.floor(index / gridSize))]}
        ))

    const [numOfBlocks, setNumOfBlocks] = useState(0)

    function handleAction(pos, action) {
        if (!editing) { return }

        const roundedPos = pos.map(coord => Math.round(coord))
        let newBlocks = blocks.slice()

        if (action === 0) {
            for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].pos[0] === roundedPos[0] && 
                    blocks[i].pos[1] === roundedPos[1] && 
                    blocks[i].pos[2] === roundedPos[2]) {

                    newBlocks = blocks.toSpliced(i, 1)
                    break
                }
            }
        } else if (action === 2) {
            for (const block of blocks) {
                if ((block.pos[0] === roundedPos[0] && 
                    block.pos[1] === roundedPos[1] && 
                    block.pos[2] === roundedPos[2]) || 
                    (pos[0] < -(gridSize / 2 - 0.5) ||
                    pos[0] > (gridSize / 2) ||
                    pos[2] < -(gridSize / 2 - 0.5) ||
                    pos[2] > (gridSize / 2))) {

                    return
                }
            }
            newBlocks = [...blocks.slice(), {pos: roundedPos, type: currentBlock}]
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
                            onAction={(pos, action) => handleAction(pos, action)} />
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
                            onAction={(pos, type, action) => handleAction(pos, type, action)} />
                    ))
                }
            </group>
        </>
    )
}

function Cube({ position, type, grid, onAction}) {
    const cubeRef = useRef()
    const cubePos = position
    const [currentFaceNorm, setCurrentFaceNorm] = useState(null)

    const getFacePos = (mult, norm=currentFaceNorm) => {
        if (!norm) return cubePos
        return [
            cubePos[0] + currentFaceNorm.x * mult,
            cubePos[1] + currentFaceNorm.y * mult,
            cubePos[2] + currentFaceNorm.z * mult,
        ]
    }

    const getFaceRot = () => {
        if (!currentFaceNorm) return [0, 0, 0]
        if (currentFaceNorm.x !== 0) return [0, Math.PI / 2, 0]
        if (currentFaceNorm.y !== 0) return [Math.PI / 2, 0, 0]
        return [0, 0, 0]
    }

    function handlePointerMove(event) {
        event.stopPropagation()
        setCurrentFaceNorm(event.face.normal)
    }

    function handlePointerClick(event) {
        event.stopPropagation()
        const faceNorm = event.face?.normal || currentFaceNorm
        if (!faceNorm) return

        if (!grid || (grid && event.button === 2)) { 
            const targetPos = (event.button === 2 
                ? ((grid && faceNorm.y < 0) ? cubePos : getFacePos(1, faceNorm)) 
                : cubePos)
                
            onAction(targetPos, event.button)
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
                        handlePointerClick(event) 
                    }}
                onPointerOver={ 
                    (event) => {
                        handlePointerMove(event) 
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
    )
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

function BuildMenu({ user, builds, currentBuildID, onBuildSelect }) {
    const { viewport } = useThree()

    const startXPos = -8
    const startYPos = 6

    //const startXPos = -viewport.width / 2 + 1
    //const startYPos = viewport.height / 2 - 1

    return (
        <group position={[startXPos, startYPos, 0]}>
            {
                builds?.filter((build) => build.visibility || (user?.id && build.author === user.id)).map((build, i) => (
                    <BuildIcon 
                        key={build.id}
                        id={build.id}
                        type={build.blocks[0]?.type || "white"} 
                        index={i} 
                        onBuildSelect={(id) => onBuildSelect(id)} 
                        currentBuildID={currentBuildID} />
                ))
            }
        </group>
    )
}

function BuildIcon({ id, type, index, onBuildSelect, currentBuildID }) {
    const spacing = 2.0
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
    
    const startXPos = 7
    const startYPos = 6

    //const startXPos = viewport.width / 2 - 4
    //const startYPos = viewport.height / 2 - 1

    //console.log(viewport.width, viewport.height)

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
    const spacing = 2.0
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

function BigHUD({ user, builds, currentBlock, onBlockSelect, currentBuildID, onBuildSelect }) {
    return (
        <Hud>
            <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 5, 10]} intensity={1} />
            
            <BuildMenu user={user} builds={builds} currentBuildID={currentBuildID} onBuildSelect={onBuildSelect} />
            <Palette currentBlock={currentBlock} onBlockSelect={onBlockSelect} />
        </Hud>
    )
}

export default function App() {
    const gridSize = 8

    const [signingUp, setSigningUp] = useState(false)
    const [loggingIn, setLoggingIn] = useState(false)

    const [user, setUser] = useState(null)
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [authMessage, setAuthMessage] = useState('')

    const [authorUsername, setAuthorUsername] = useState('')

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    async function handleSignUp() {
        setAuthMessage('')
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username: username.toLowerCase().trim() }} })
        setAuthMessage(error ? 
            (error.message.includes('{}') 
            ? 'Username is already taken.' : error.message) 
            : 'Signed up. Please check your email for a confirmation link.')
        if (!error) { 
            setSigningUp(false) 
        }
    }

    async function handleLogIn() {
        setAuthMessage('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setAuthMessage(error ? error.message : 'Logged in.')
        if (!error) { 
            setLoggingIn(false) 
            setAuthMessage('') 
        }
    }

    async function handleLogOut() {
        await supabase.auth.signOut()
        setAuthMessage('Logged out.')
        setSigningUp(false)
        setLoggingIn(false)
        setAuthMessage('')
        if (!currentBuild.visibility) {
            selectBuildID(builds[0].id)
        }
    }

    const [currentBlock, setCurrentBlock] = useState('white')
    
    const [builds, setBuilds] = useState([
        {   
            id: '',
            title: 'Loading builds...',
            author: '',
            blocks: [],
            version: 0,
            visibility: false,
            created_at: "2026-07-29T12:00:00.000000+00:00"
        }
    ])

    useEffect(() => {
        async function getBuilds() {
            const { data: dataBuilds, error } = await supabase
                .from('builds')
                .select()
                .order('created_at', { ascending: true })

            if (error) {
                console.error("Supabase Error: ", error.message)
                return
            } else if (dataBuilds && dataBuilds.length > 0) {
                console.log(dataBuilds)
                setBuilds(dataBuilds)
                selectBuildID(dataBuilds[0].id)
            }
        }
        getBuilds()
    }, [])

    const [title, setTitle] = useState('')
    
    async function handleCreate() {
        if (title.trim().length > 0) {
            const newBuild = await sendBuild(title)
            if (newBuild && newBuild.id) {
                setBuilds((builds) => [...builds, newBuild])
                selectBuildID(newBuild.id)

                await updateProfile(newBuild.id)
                
                setTitle('')
            }
        }
    }

    const [currentBuildID, setBuildID] = useState(builds[0].id)
    const currentBuild = builds.find((build) => 
        build.id === currentBuildID) || builds[0]
    const currentVersion = currentBuild.version
    const editingBuild = !currentBuild?.author || (user?.id && currentBuild.author === user.id)

    async function selectBuildID(id) {
        setBuildID(id)
        const thisBuild = builds.find((build) => build.id === id) || builds[0]
        
        if (!thisBuild.author) { 
            setAuthorUsername('')
            return 
        }
        
        const author = await getUsername(thisBuild.author)

        if (author) { 
            setAuthorUsername(author) 
        } else { 
            setAuthorUsername('') 
        }
        
    }

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

    function updateVisibility(id, visibility) {
       const thisBuild = builds.find((build) => build.id === id)
        if (!thisBuild) { return }

        const newBuild = {
            ...thisBuild,
            visibility: visibility,
            version: thisBuild.version + 1,
        }

        setBuilds((builds) =>
            builds.map((build) => (build.id === id ? newBuild : build))
        )
        console.log(newBuild)
        sendBuild(newBuild)
        
    }

    async function updateProfile(buildID=null) {
        console.log("new build id: ", buildID)
        try {
            if (!(buildID && user)) { return }

            const { data, error } = await supabase.rpc('append_build_id', {
                profile_id: user.id,
                new_build_id: buildID
            })
        
            if (error) {
                console.error("Error updating profile to Supabase: ", error.message)
                return
            }

            console.log("Profile saved successfully: ", data)

        } catch (error) {
            console.error("Error sending request: ", error)
        }
    }

    async function sendBuild(buildOrTitle=null) {
        try {
            const isBuildObject = typeof buildOrTitle === 'object' && buildOrTitle !== null

            const query = isBuildObject
                ? supabase.from("builds").upsert({
                    id: buildOrTitle.id,
                    title: buildOrTitle.title,
                    author: buildOrTitle.author,
                    blocks: buildOrTitle.blocks,
                    version: buildOrTitle.version,
                    visibility: buildOrTitle.visibility,
                    created_at: buildOrTitle.created_at
                }) 
                : supabase.from("builds").insert({
                    title: typeof buildOrTitle === 'string' ? buildOrTitle : title,
                    author: user?.id
                })

            const { data, error } = await query.select()
            
            if (error) {
                console.error("Error saving build to Supabase: ", error.message)
                return
            }

            console.log("Build saved successfully: ", data)

            return data ? data[0] : null

        } catch (error) {
            console.error("Error sending request: ", error)
            return null
        }
    }

    async function deleteBuild(id) {
        if (!window.confirm("Are you sure you want to delete this build? ")) { return }

        try {
            const { error: buildError } = await supabase
                .from('builds')
                .delete()
                .eq('id', id)

            if (buildError) {
                console.error("Error deleting build from Supabase: ", buildError.message)
                return
            }

            const { error: profileError } = await supabase.rpc('remove_build_id', {
                profile_id: user.id,
                target_build_id: id
            });

            if (profileError) {
                console.error("Error updating profile to Supabase: ", profileError.message)
                return
            }

            setBuilds((builds) => {
                const newBuilds = builds.filter((build) => build.id !== id)

                if (id === currentBuildID) {
                    selectBuildID(newBuilds[0].id)
                }
                return newBuilds
            })

        } catch (error) {
            console.error("Error during deletion: ", error)
        }
    }

    async function getUsername(userID) {
        const { data: author, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userID)
            .maybeSingle()

        if (error) {
            console.error("Error fetching author: ", error.message)
            return null
        }

        console.log("id: ", userID, " username: ", author.username)
        return author.username
    }

    return (
        <div style={{width:'100vw', height:'100vh', background:'black'}}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, marginBottom: '1.5rem',color: 'white' }}>
                {authMessage && <p>{authMessage}</p>}
                
                <div style={{ marginBottom: '1.5rem' }}>
                    {user ? (
                        <div>
                            <span>Logged in as: {user.email} </span>
                            <button onClick={handleLogOut}>Log Out</button>
                        </div>
                    ) : (
                        <div>
                            { (loggingIn || signingUp) && <div>
                                <input
                                    type="email" 
                                    placeholder="Email" 
                                    value={email} 
                                    onChange={(event) => setEmail(event.target.value)} 
                                />
                                { signingUp && <input 
                                    type="text" 
                                    placeholder="Username" 
                                    value={username} 
                                    onChange={(event) => setUsername(event.target.value)} 
                                /> }
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    value={password} 
                                    onChange={(event) => setPassword(event.target.value)} 
                                /> 
                            </div> }
                            { (signingUp || loggingIn) && <button onClick={ () => { 
                                    setSigningUp(false) 
                                    setLoggingIn(false) 
                                    setAuthMessage('') }}
                                >Back</button> }
                            { !loggingIn && <button onClick={ () => signingUp ? handleSignUp() : setSigningUp(true) }>Sign Up</button> }
                            { !signingUp && <button onClick={ () => loggingIn ? handleLogIn() : setLoggingIn(true) }>Log In</button> }
                        </div>
                    )}
                </div>



                {user ? (
                    <div>
                        <input 
                            type="text" 
                            placeholder="Title" 
                            value={title}
                            onChange={(event) => setTitle(event.target.value)} 
                        />
                        <button onClick={handleCreate}>Create New Build</button>
                    </div>
                ) : (
                    <span>Log in with an account to create a build. </span>
                )}
                    
                        <div style={{ marginTop: '1rem' }}>
                            <span> {currentBuild.title} </span>
                            {authorUsername && ( <span style={{ display: 'block' }}> by {authorUsername} </span> )}
                        </div>

                        {editingBuild && ( 
                            <div>
                                {currentBuild.author && (
                                <div>
                                    <label htmlFor="visibility">Creation Visibility: </label>

                                    <select id="visibility" value={String(currentBuild.visibility)} onChange={(event) => updateVisibility(currentBuildID, event.target.value === 'true')}>
                                        <option value='false'>Private</option>
                                        <option value='true'>Public</option>
                                    </select>
                                </div> )}

                                <button 
                                    style={{ display: 'block', marginTop: '1rem' }}
                                    onClick={() => sendBuild(currentBuild)}>
                                        Save Build
                                </button> 

                                {currentBuild.author && (
                                    <button 
                                        style={{ display: 'block', marginTop: '1rem' }}
                                        onClick={() => deleteBuild(currentBuildID)}>
                                            Delete Build
                                    </button> 
                                )}
                            </div> )}
                    </div>
            
            <Canvas camera={{position: [0, 8, 8]}}>
                <ambientLight intensity={0.35} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <Build 
                    key={`${currentBuildID}-${currentVersion}`}
                    editing={editingBuild}
                    gridSize={gridSize}
                    currentBlock={currentBlock} 
                    currentBuild={currentBuild} 
                    setBuilds={(id, blocks) => updateBuilds(id, blocks)} />
                <OrbitControls enableZoom={true} />
                <BigHUD 
                    user={user}
                    builds={builds}
                    currentBlock={currentBlock} 
                    onBlockSelect={(type, button) => selectBlock(type, button)} 
                    currentBuildID={currentBuildID} 
                    onBuildSelect={(id) => {
                        selectBuildID(id)
                        }} />            
            </Canvas>
        </div>
    )
}