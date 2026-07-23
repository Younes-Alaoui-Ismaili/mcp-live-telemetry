# Note d'appropriation (interne)

Document de reference pour presenter et defendre ce projet. Redige en francais pour usage interne. Le reste du depot est en anglais.

## Architecture en 10 lignes

1. Serveur MCP en TypeScript sur le SDK officiel `@modelcontextprotocol/sdk`, transport stdio (processus local du client).
2. Quatre outils exposes : `list_devices`, `get_telemetry`, `get_anomalies`, `simulate_fault`.
3. Chaque outil porte un schema d'entree Zod strict, un schema de sortie documente et des annotations de comportement.
4. Le coeur de simulation vit sous `src/simulator/` : generateur seede, detection d'anomalies, et une facade `Simulator`.
5. Les lectures sont deterministes : une valeur depend de (graine, identifiant machine, horodatage), donc toute fenetre est reproductible.
6. Detection par seuil : une machine saine reste sous le seuil, un defaut injecte le franchit toujours.
7. `simulate_fault` modifie l'etat en memoire ; les trois autres outils sont en lecture seule.
8. La facade `Simulator` est le seul point de couplage : la remplacer branche une source de donnees reelle sans toucher aux outils.
9. Tests vitest (unitaires plus une session MCP de bout en bout via transport en memoire), couverture au dessus de 80 pour cent.
10. CI GitHub Actions sur Node 20 et 22 : garde typographique, lint, build, tests. Licence MIT.

## Les 5 questions probables d'un client

### 1. Pourquoi MCP plutot qu'une API REST ou un connecteur maison ?

MCP est un protocole ouvert et standard pour donner a un assistant un acces outille a un systeme. Vous ecrivez le contrat une fois (des outils typés) et il fonctionne avec tout client compatible, sans code de colle propre a un fournisseur. Vous gardez la main sur ce qui est expose et sur la forme des reponses.

### 2. Securite : que peut faire l'assistant, et que ne peut-il pas faire ?

Seuls les outils declares existent ; il n'y a pas d'acces libre au systeme. Les entrees sont validees par des schemas stricts avant tout traitement. Chaque outil declare son intention (lecture seule ou modification) via des annotations, ce qui permet a un client d'imposer une approbation humaine sur les actions qui changent l'etat. Le transport stdio garde le serveur local au client, sans surface reseau ouverte.

### 3. Couts : combien coute ce genre de serveur ?

Le serveur lui meme est un petit processus local : la charge de calcul est negligeable. Le cout reel est celui de l'usage du modele cote client (les jetons consommes par les appels), qui depend de votre volume. Le code est sous licence MIT : pas de licence par siege ni de frais recurrents lies a ce depot.

### 4. Integration a mon stack : comment le brancher sur mes donnees reelles ?

Le simulateur est isole derriere la facade `Simulator` (`src/simulator/store.ts`). Pour cibler vos vraies donnees, on remplace le corps de cette facade par des appels a votre backend (historien, courtier MQTT, point d'acces REST). Les quatre outils, leurs schemas et leurs sorties restent identiques, donc un client qui marche sur la demo marche sur vos donnees.

### 5. Maintenance : comment ca evolue et qui l'entretient ?

Le projet est petit et couvert par des tests, avec une CI qui bloque un changement qui casse le build, le lint ou les tests. Ajouter un outil ou une source de donnees se fait localement, avec un test qui accompagne le changement. La dependance principale est le SDK MCP officiel, qui suit le protocole ; une montee de version se fait de facon controlee via la CI.
