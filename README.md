# e80-supsi
Rag system for e80


## Setup

### Neo4j

```bash
docker run -d \
    --name e80-neo4j \
    --restart always \
    --publish=7474:7474 --publish=7687:7687 \
    --volume=/path/to/your/data:/data \
    neo4j:2026.10.0
```

Default password: `neo4j`

Test seed (WARNING, removes ALL ENTRIES):

```bash
docker cp seed.cypher e80-neo4j:/tmp/
docker exec e80-neo4j cypher-shell -u neo4j -p <password> -f /tmp/seed.cypher
```
