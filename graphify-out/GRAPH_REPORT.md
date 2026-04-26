# Graph Report - C:\Users\shiva\Desktop\Documind  (2026-04-27)

## Corpus Check
- 7 files · ~11,060 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 41 nodes · 62 edges · 10 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `User` - 6 edges
2. `get_user_chats_dir()` - 6 edges
3. `load_history()` - 5 edges
4. `save_history()` - 5 edges
5. `register()` - 4 edges
6. `upload_pdfs()` - 4 edges
7. `create_token()` - 3 edges
8. `RegisterModel` - 3 edges
9. `LoginModel` - 3 edges
10. `login()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `User` --calls--> `register()`  [INFERRED]
  C:\Users\shiva\Desktop\Documind\backend\database.py → C:\Users\shiva\Desktop\Documind\backend\main.py
- `hash_password()` --calls--> `register()`  [INFERRED]
  C:\Users\shiva\Desktop\Documind\backend\auth.py → C:\Users\shiva\Desktop\Documind\backend\main.py
- `verify_password()` --calls--> `login()`  [INFERRED]
  C:\Users\shiva\Desktop\Documind\backend\auth.py → C:\Users\shiva\Desktop\Documind\backend\main.py
- `create_token()` --calls--> `register()`  [INFERRED]
  C:\Users\shiva\Desktop\Documind\backend\auth.py → C:\Users\shiva\Desktop\Documind\backend\main.py
- `create_token()` --calls--> `login()`  [INFERRED]
  C:\Users\shiva\Desktop\Documind\backend\auth.py → C:\Users\shiva\Desktop\Documind\backend\main.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.28
Nodes (9): clear_all_history(), delete_from_history(), get_history(), get_user_history_file(), load_from_history(), load_history(), process_pdf(), save_history() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.32
Nodes (6): Base, BaseModel, User, LoginModel, Question, RegisterModel

### Community 2 - "Community 2"
Cohesion: 0.38
Nodes (5): create_token(), hash_password(), verify_password(), login(), register()

### Community 3 - "Community 3"
Cohesion: 0.4
Nodes (2): get_all_chats(), get_chats()

### Community 4 - "Community 4"
Cohesion: 0.67
Nodes (3): clear_all_chats(), delete_chat(), get_user_chats_dir()

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (3): ask_question(), get_chat(), save_chat()

### Community 6 - "Community 6"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 6`** (2 nodes): `App()`, `App.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `register()` connect `Community 2` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `login()` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `User` (e.g. with `RegisterModel` and `LoginModel`) actually correct?**
  _`User` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `register()` (e.g. with `User` and `hash_password()`) actually correct?**
  _`register()` has 3 INFERRED edges - model-reasoned connections that need verification._