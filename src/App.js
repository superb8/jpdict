import { useEffect, useRef, useState } from "react";

import './App.css';
import RAW_WORDS from './words.json';
import styled from 'styled-components';
import * as wanakana from 'wanakana';

const PAGECOUNT = 1000;

let Dict = styled.div`
	width: 320px;
    margin: 0 auto;
    padding: 0 4px;
	
	& ol {
		margin-top: 0;
	}
	
	& ol li {
		margin-left: 1rem;
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

let WORDS = RAW_WORDS.map((e,i)=>[i+1,...e])

function App() {
	let inputRef = useRef(null);
	let [searchText,setSearchText] = useState('');
	let [words,setWords] = useState(WORDS);
	let [_tabIndex, setTabIndex] = useState(0);
	let tabIndex = Math.max(Math.min(_tabIndex, words.length/PAGECOUNT-1), 0)
	
	useDebouncedEffect(()=>{
		let _searchText = inputRef.current.value.trim()
		if (_searchText.length>0) {
			try {
				let patterns = _searchText.split(' ').filter(e=>e).map(e=>new RegExp(e))
				setWords(WORDS.filter(([i,w,n])=>patterns.some(p=>p.exec(w))));
			} catch {}
		} else
			setWords(WORDS);
	}, [searchText, inputRef], 500)
	
	console.log(searchText)
	
	useEffect(()=>{
		
		inputRef.current && wanakana.bind(inputRef.current, {
			customKanaMapping: { '.': '.', '^':'^', '$':'$', '+':'+', '?':'?', '[':'[', ']':']' }
		})
	}, [inputRef])
	
	let tabLinks = []
	for (let i=0; i<Math.ceil(words.length/PAGECOUNT); i+=1) {
		if (tabIndex!==i) {
			tabLinks.push(<span className="tabLink" onClick={evt=>setTabIndex(i)}>{i+1}</span>)
		} else {
			tabLinks.push(<b className="tabLink">{i+1}</b>)
		}
	}
	
	return (
	<Dict>
		<Head>
			<div>搜索：<input ref={inputRef} onChange={evt=>setSearchText(evt.target.value)}/></div>
			<div>{tabLinks}</div>
		</Head>
		
		<ol>
		{
			words.slice(tabIndex*PAGECOUNT, (tabIndex+1)*PAGECOUNT).map(([i,w,n])=>{
				return <li key={i} value={i}>{w}</li>
			})
		}
		</ol>
	</Dict>
	);
}

export default App;
