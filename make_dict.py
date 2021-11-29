import json, tqdm, re, gzip
import xml.etree.ElementTree as ET

POS="""
prt				particle
adj-ix  		adjective (keiyoushi) - yoi/ii class
cop				copula
unc				unclassified
v-unspec		verb unspecified

adj-shiku		'ku' adjective (archaic)
adj-shiku		'shiku' adjective (archaic)
v2a-s			Nidan verb with 'u' ending (archaic)
v2d-s			Nidan verb (lower class) with 'dzu' ending (archaic)
v2t-s			Nidan verb (lower class) with 'tsu' ending (archaic)
v2s-s			Nidan verb (lower class) with 'su' ending (archaic)
v2w-s			Nidan verb (lower class) with 'u' ending and 'we' conjugation (archaic)
v2z-s			Nidan verb (lower class) with 'zu' ending (archaic)
v2k-s			Nidan verb (lower class) with 'ku' ending (archaic)
v2n-s			Nidan verb (lower class) with 'nu' ending (archaic)
v2g-s			Nidan verb (lower class) with 'gu' ending (archaic)
v2y-s			Nidan verb (lower class) with 'yu' ending (archaic)
v2h-s			Nidan verb (lower class) with 'hu/fu' ending (archaic)
v2m-s			Nidan verb (lower class) with 'mu' ending (archaic)
v2r-s			Nidan verb (lower class) with 'ru' ending (archaic)
v2k-k			Nidan verb (upper class) with 'ku' ending (archaic)
v2g-k			Nidan verb (upper class) with 'gu' ending (archaic)
v2h-k			Nidan verb (upper class) with 'hu/fu' ending (archaic)
v2t-k			Nidan verb (upper class) with 'ru' ending (archaic)
v2t-k			Nidan verb (upper class) with 'tsu' ending (archaic)
v2b-k			Nidan verb (upper class) with 'bu' ending (archaic)
v2y-k			Nidan verb (upper class) with 'yu' ending (archaic)
v4b				Yodan verb with 'bu' ending (archaic)
v4h				Yodan verb with 'hu/fu' ending (archaic)
v4g				Yodan verb with 'gu' ending (archaic)
v4k				Yodan verb with 'ku' ending (archaic)
v4m				Yodan verb with 'mu' ending (archaic)
v4r				Yodan verb with 'ru' ending (archaic)
v4s				Yodan verb with 'su' ending (archaic)
v4t				Yodan verb with 'tsu' ending (archaic)

ADJ-I			adjective (keiyoushi)
ADJ-NA 形容動詞	adjectival nouns or quasi-adjectives (keiyodoshi)
ADJ-NARI		archaic/formal form of na-adjective
VK				Kuru verb - special class
N 普通名詞		noun (common) (futsuumeishi)
N-PREF			noun, used as a prefix
N-SUF			noun, used as a suffix
V1				Ichidan verb
VZ				Ichidan verb - zuru verb (alternative form of -jiru verbs)
V1-S			Ichidan verb - kureru special class
AUX				auxiliary
AUX-ADJ			auxiliary adjective
AUX-V       	auxiliary verb
NUM 			numeric
CONJ 連語		conjunction
ADV 副詞		adverb (fukushi)
PREF 接頭語		prefix
SUF 接尾語		suffix
VR				irregular ru verb, plain form ends with -ri
INT 感動詞		interjection (kandoushi)
ADJ-PN 連体詞	pre-noun adjectival (rentaishi)
ADJ-NO			nouns which may take the genitive case particle 'no'
ADJ-T			'taru' adjective
ADV-TO			adverb taking the 'to' particle
VN				irregular nu verb
VS				noun or participle which takes the aux. verb suru
VS-C			su verb - precursor to the modern suru
VS-I			suru verb - included
VS-S			suru verb - special class
PN 代名詞		pronoun
EXP				expressions (phrases, clauses, etc.)
VI 自動詞		intransitive verb
VT 他動詞		transitive verb
ADJ-F			noun or verb acting prenominally
CTR 助数詞		counter
V5ARU			Godan verb - -aru special class
V5B				Godan verb with 'bu' ending
V5G				Godan verb with 'gu' ending
V5K				Godan verb with 'ku' ending
V5K-S			Godan verb - Iku/Yuku special class
V5M				Godan verb with 'mu' ending
V5N				Godan verb with 'nu' ending
V5S				Godan verb with 'su' ending
V5R				Godan verb with 'ru' ending
V5R-I			Godan verb with 'ru' ending (irregular verb)
V5T				Godan verb with 'tsu' ending
V5U				Godan verb with 'u' ending
V5U-S			Godan verb with 'u' ending (special class)
"""

lines = POS.split('\n')
lines = [ l.strip() for l in lines ]
lines = [ l for l in lines if len(l)>0 ]
lines = [ re.split("\t+", l) for l in lines ]
posAbbr = dict([ (i,a) for i,[a,b] in enumerate(lines)])
posmap = dict([ (b,i) for i,[a,b] in enumerate(lines)])

########################################################################

with gzip.open('JMdict_e_examp.gz', 'rb') as f:
    file_content = f.read()

root = ET.fromstring(file_content)
with open('src/words.json', 'r', encoding='utf8') as f: word=json.loads(f.read())

parent_map = {c: p for p in root.iter() for c in p}

smap = []
def prepare():
    nodes = root.findall(f'entry/k_ele/keb')
    for e in nodes:
        if e is not None and len(e.text)>0:
            smap.append([e.text, parent_map.get(parent_map.get(e))])
            
    nodes = root.findall('entry/r_ele/reb')
    for e in nodes:
        if e is not None and len(e.text)>0:
            smap.append([e.text, parent_map.get(parent_map.get(e))])
            
def formatEntry(enode):
    result = []
    result.append([ e.text for e in enode.findall('k_ele/keb') ])
    result.append([ e.text for e in enode.findall('r_ele/reb') ])

    sense=[]
    for snode in enode.findall('sense'):
        pos = [ posmap.get(pnode.text) for pnode in snode.findall('pos') ]
        gloss = [ gnode.text for gnode in snode.findall('gloss') ]
        sense.append([pos, gloss])
    result.append(sense)
    result.append([ [ sentNode.text for sentNode in ex_node.findall('ex_sent')] for ex_node in enode.findall('sense/example')])
    return result

def find(text):
    return [ e[1] for e in smap if e[0]==text ]


prepare()

wordR = [ find(w) for [w,_] in tqdm.tqdm(word) ]

dict_keylist = set([ e for a in wordR for e in a])
dict_keylist = sorted(dict_keylist, key=lambda w: w.find('ent_seq').text)
fmap, rmap={}, {}
for i,e in enumerate(dict_keylist):
    fmap[i]=e
    rmap[e]=i

dictionary = [ formatEntry(e) for e in dict_keylist ]
dict_map = [ [ rmap.get(e) for e in match ] for match in wordR ]

with open('public/dictionary.json', 'w', encoding='utf8') as f:
    f.write(json.dumps(dictionary, ensure_ascii=False))
with open('public/dict_map.json', 'w', encoding='utf8') as f:
    f.write(json.dumps(dict_map, ensure_ascii=False))
with open('src/posAbbr.json', 'w', encoding='utf8') as f:
    f.write(json.dumps(posAbbr, ensure_ascii=False))
