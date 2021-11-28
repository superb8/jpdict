import { useEffect, useRef, useState } from "react";

import './App.css';
import RAW_WORDS from './words.json';
import styled from 'styled-components';
import * as wanakana from 'wanakana';
import axios from 'axios'
import ReactTooltip from 'react-tooltip'
import urlJoin from 'url-join'

const PAGECOUNT = 1000;

let Dict = styled.div`
	width: 320px;
    margin: 0 auto;
    padding: 0 4px;
	
	& ol.words {
		margin-top: 0;
	}
	
	& ol li {
		margin-left: 1rem;
	}
	
	& ol li:hover {
		background: #eef;
	}
	
	& .word {
		display: inline-block;
		min-width: 4rem;
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
    top: 0px;
    position: sticky;
    background: white;
	padding-bottom: 1rem;
	font-size:1.2rem;
	
	& > div {
		display: flex;
		justify-content: space-evenly;
	}
	
	input {
		flex-grow: 1;
	}
	
	.tabLink {
		padding: 0.2rem;
		margin-top:0.1rem;
		margin-left:0.1rem;
		margin-right:0.1rem;
		margin-bottom:0.1rem;
		cursor: pointer;
	}
`

export const useDebouncedEffect = (effect, deps, delay) => {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);

        return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps || [], delay]);
}

let WORDS = RAW_WORDS.map((e,i)=>[i,...e])
let DEFAULT_SEARCH_KEYWORD = WORDS.map(([i,w,n])=>[wanakana.toKatakana(w)])

function App() {
	let inputRef = useRef(null);
	let [dictMap,setDictMap] = useState([])
	let [dictionary,setDictionary] = useState([])
	let [searchText,setSearchText] = useState('');
	let [words,setWords] = useState(WORDS);
	let [_tabIndex, setTabIndex] = useState(0);
	let tabIndex = Math.max(Math.min(_tabIndex, words.length/PAGECOUNT-1), 0)
	let [searchKeyword, setSearchKeyword] = useState(DEFAULT_SEARCH_KEYWORD)
	
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
	}, [words, tabIndex])
	
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
	
	let tabLinks = []
	for (let i=0; i<Math.ceil(words.length/PAGECOUNT); i+=1) {
		if (tabIndex!==i) {
			tabLinks.push(<span key={"tab-"+i} className="tabLink" onClick={evt=>setTabIndex(i)}>{i+1}</span>)
		} else {
			tabLinks.push(<b key={"tab-"+i} className="tabLink">{i+1}</b>)
		}
	}
	
	return (
		<Dict>
			<Head>
				<div>{'Search：'}<input ref={inputRef} onChange={evt=>setSearchText(evt.target.value)} onKeyDown={evt=>setSearchText(evt.target.value)}/></div>
				<div>{tabLinks}</div>
			</Head>
			
			<ol className="words">
			{
				words.slice(tabIndex*PAGECOUNT, (tabIndex+1)*PAGECOUNT).map(([i,w,n])=>{
					return <li key={i} value={i+1}><span className="word" data-tip={i} data-for="dict-tooltip">{w}</span></li>
				})
			}
			</ol>
			<ReactTooltip id='dict-tooltip' delayHide={1000} place="right" type="info" effect="solid" getContent={(id) => { 
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
	);
}

export default App;
