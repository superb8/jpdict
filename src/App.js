import { useEffect, useRef, useState } from "react";

import './App.css';
import posAbbr from './posAbbr.json';
import RAW_WORDS from './words.json';
import JLPT from './jlpt.json';
import styled from 'styled-components';
import * as wanakana from 'wanakana';
import axios from 'axios'
import ReactTooltip from 'react-tooltip'
import urlJoin from 'url-join'
import {useDebouncedEffect, useMediaQuery} from './hooks'

const PAGECOUNT = 1000;

let FixedPosition = styled.div`
	position:fixed;
	top:0;bottom:0;
	left:0;right:0;
`

let Dict = styled.div`
	width: 320px;
    margin: 0 auto;
    padding: 0 4px;
	height: 100%;
	position: relative;
	
	
	#dict-tooltip {
		max-width: 30rem;
	}
	
	@media (max-width: 575px) {
		width:100%;
		ol.words {
			width: 100% !important;
			padding-left:3rem;
			padding-right:3rem;
		}
	}
	
	@media (min-width: 576px) and (max-width: 767px) {
		width:550px !important;
	}
	@media (min-width: 768px) and (max-width: 950px) {
		width:750px !important;
	}
	@media (min-width: 950px) {
		width:940px !important;
	}
	
	& ol li {
		margin-left: 1rem;
	}
	
	& ol li:hover {
		background: #eef;
	}
	
	& #dict-tooltip {
		.kanji {
			font-size: 1rem;
		}
		.r {
			font-size: 0.8rem;
			margin-left:1rem;
		}
		ol {
			padding-inline-start: 0.5rem;
			margin-top: 0;
		}
	}
`

let Head = styled.div`
	position: relative;
    top: 0px;
	height: 72px;
    background: white;
	padding-top: 1rem;
	padding-bottom: 1rem;
	font-size:1.2rem;
	
	label {
		display: flex;
		justify-content: space-evenly;
		font-size:1.5rem;
		margin:0 0.8rem;
		
		input {
			flex-grow: 1;
			font-size:1.5rem;
		}
	}
	
	& > div {
		display: flex;
		justify-content: space-evenly;
		
		span,b {
			flex-grow: 1;
			text-align: center;
		}
	}
	
	.tabLink {
		display: inline-block;
		margin-top:0.1rem;
		margin-left:0.1rem;
		margin-right:0.1rem;
		margin-bottom:0.1rem;
		cursor: pointer;
	}
`

let Body = styled.div`
	position: absolute;
	top: 96px;
	bottom: 0px;
	width: 100%;
	display: flex;
	
	& ol.words {
		margin-top: 0;
		overflow-y: auto;
		height: 100%;
		min-width:200px;
	}
	
	& ol.words li.selected {
		background:#fbc;
	}
	
	& ol.words li .word {
		display: inline-block;
		min-width: 5rem;
	}
`

let Badge = styled.span`
	display: inline-block;
    padding: 0.25em 0.4em;
    font-size: 75%;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
    user-select: none !important;
	
	color: #fff;
    background-color: #17a2b8;
	margin-left: 0.25rem!important;
	margin-right: 0.25rem!important;
`

let JLPTBadge = styled.span`
	display: inline-block;
    padding: 0.25em 0.4em;
    font-size: 75%;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
    user-select: none !important;
	
	color: #fff;
    background-color: #b8a230;
	margin-left: 0.25rem!important;
	margin-right: 0.25rem!important;
`

let ExplainArea = styled.div`
	background:#fff2ff;
	flex-grow: 1;
	padding: 0.8rem;
	overflow-y: auto;
	
	span.k {
		font-size: 1.5rem;
		font-weight: bold;
	}
	span.r {
		font-size: 0.9rem;
		padding-left:1rem;
	}
	.exJP {

	}
	.exEN {
		font-size: 0.9rem;
		color: #575;
		padding-inline-start: 1rem;
	}
`

let Meaning = ({data}) => {
	if (!Array.isArray(data) || data.length!==4) 
		return <div/>
	let k = data[0].join("・")
	let r = data[1].join(", ")
	
	let explains = data[2].map(([pos,explain],index)=>
		<li key={index}>{pos.map((p,i)=>posMap[p]({key: i}))}{explain.join(' / ')}</li>
	)
	let examples = data[3].map(([jpn,eng],index)=>
		<li key={index}>
			<div className="exJP">{jpn}</div>
			<div className="exEN">{eng}</div>
		</li>
	)
	return (
	<div>
		<div>
			<span className="k">{k || r}</span>
			{ k && (<span className="r">{r}</span>)}
		</div>
		<ol>
			{explains}
		</ol>
		<ol>
			{examples}
		</ol>
	</div>
	)
}

let posMap = Object.fromEntries(
		Object.entries(posAbbr).map(([i, [abbr, detail]])=>[i, (prop)=>(
			<Badge {...prop} data-tip={detail} data-for="pos-tooltip">{abbr}</Badge>
		)] )
	)

let WORDS = RAW_WORDS.map((e,i)=>[i,e[0],JLPT[i]])
let DEFAULT_SEARCH_KEYWORD = WORDS.map(([i,w,n])=>[wanakana.toKatakana(w)])
let DEFAULT_SELECTED_INDEX = Math.floor(Math.random()*WORDS.length)

function App() {
	let inputRef = useRef(null);
	let [dictMap,setDictMap] = useState([]);
	let [dictionary,setDictionary] = useState([]);
	let [searchText,setSearchText] = useState('');
	let [words,setWords] = useState(WORDS);
	let [_tabIndex, setTabIndex] = useState(0);
	let tabIndex = Math.max(Math.min(_tabIndex, words.length/PAGECOUNT-1), 0)
	let [searchKeyword, setSearchKeyword] = useState(DEFAULT_SEARCH_KEYWORD)
	let [selectedIndex, setSelectedIndex] = useState(DEFAULT_SELECTED_INDEX)
	
	useEffect(()=>{
		(async function() {
			try {
				let r_dictionary = await axios.get(urlJoin(window.location.href, 'dictionary.json'))
				let r_dictmap = await axios.get(urlJoin(window.location.href, 'dict_map.json'))
				
				if (r_dictionary.data.length>0 && r_dictmap.data.length>0) {
					setDictionary(r_dictionary.data)
					setDictMap(r_dictmap.data)
				}
			} catch(e) {
				console.error('cannot load dictionary file')
			}
		})()
	}, [])
	
	useEffect(()=>{
		if (dictMap.length>0 && dictionary.length>0) {
			setSearchKeyword(WORDS.map(([i,w,n])=>{
				if (dictMap[i].length>0) {
					return dictMap[i].map(id=>[w, ...dictionary[id][0], ...dictionary[id][1]]).flat().map(e=>wanakana.toKatakana(e))
				} else
					return [wanakana.toKatakana(w)]
			}))
		}
	}, [dictMap, dictionary])
	
	useEffect(()=>{
		ReactTooltip.rebuild()
	}, [words, tabIndex, selectedIndex])
	
	useDebouncedEffect(()=>{
		let start = window.performance.now()
		let patterns = wanakana.toKatakana(inputRef.current.value.trim())
								.split(' ')
								.filter(e=>e)
								.map(e=>new RegExp(e))
		if (patterns.length>0) {
			try {
				setWords(WORDS.filter((_,index)=>{
					let assoc = searchKeyword[index]
					return patterns.some(p=>assoc.some(a=>p.exec(a)))
				}));
			} catch {}
		} else
			setWords(WORDS);
		let elapsed = window.performance.now() - start;
		console.debug(`search: ${patterns} [${elapsed}]`)
	}, [searchText, searchKeyword], 500)
	
	useEffect(()=>{
		inputRef.current && wanakana.bind(inputRef.current, {
			customKanaMapping: { '.': '.', '^':'^', '$':'$', '+':'+', '?':'?', '[':'[', ']':']' }
		})
	}, [inputRef])
	
	const largeMode = useMediaQuery('(min-width: 576px)');
	
	let tabLinks = []
	for (let i=0; i<Math.ceil(words.length/PAGECOUNT); i+=1) {
		if (tabIndex!==i) {
			tabLinks.push(<span key={"tab-"+i} className="tabLink" onClick={evt=>setTabIndex(i)}>{i+1}</span>)
		} else {
			tabLinks.push(<b key={"tab-"+i} className="tabLink">{i+1}</b>)
		}
	}
	
	return (
	<FixedPosition>
		<Dict>
			<Head>
				<label>{'Search：'}<input ref={inputRef} onChange={evt=>setSearchText(evt.target.value)} onKeyDown={evt=>setSearchText(evt.target.value)}/></label>
				<div>{tabLinks}</div>
			</Head>
			
			<Body>
				<ol className="words">
				{
					words.slice(tabIndex*PAGECOUNT, (tabIndex+1)*PAGECOUNT).map(([i,w,n])=>{
						let props = {
							key: i, 
							value: i+1, 
							onClick: ()=>setSelectedIndex(i),
						}
						if (i===selectedIndex)
							props['className'] = 'selected'
						return (
							<li {...props}>
								<span className="word" data-tip={i} data-for="dict-tooltip">{w}</span>
								{n>0 && [' ', <JLPTBadge>JLPT {n}</JLPTBadge>]}
							</li>
						)
					})
				}
				</ol>
				{ largeMode &&
					<ExplainArea>
						{(dictMap[selectedIndex] || []).map(id=>
							<Meaning key={`dictionary-${id}`} data={dictionary[id]} />
						)}
						<ReactTooltip id='pos-tooltip' place="bottom" type="info" effect="solid" />
					</ExplainArea>
				}
			</Body>
			
			<ReactTooltip id='dict-tooltip' delayHide={500} place={largeMode?'left':'bottom'} type="success" effect="solid" getContent={(id) => { 
				id = parseInt(id)
				if (id>=0 && dictMap[id]) {
					const matches = dictMap[id].map(dictIndex=>[dictIndex, dictionary[dictIndex]]).filter(e=>e[1])
					if (matches && matches.length>0) {
						return matches.map(([dictIndex, match])=>(
							<div key={"dictionary"+dictIndex}>
								<div>
									<span className="kanji">{match[0].join(", ") || match[1][0]}</span>
									<span className="r">({match[1].join(", ")})</span>
								</div>
								<ol>{
									match[2].map(([pos,explain],index)=>
										<li key={index}>{explain.join(' / ')}</li>
									)
								}</ol>
							</div>
						))
					}
				}
				return null;
			}}/>
		</Dict>
	</FixedPosition>
	);
}

export default App;
