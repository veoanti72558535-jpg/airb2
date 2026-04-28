# 📝 AirBallistiK — Todo Mémo

Ce fichier centralise les tâches, améliorations et idées à implémenter ultérieurement, notées durant les sessions de développement.

> [!TIP]
> **Trigger :** Pour ajouter un élément ici, dites simplement : *"rappelez moi de le faire plustard"*.

---

## 🚀 Priorités & Idées en attente

### 🎯 Balistique & Physique
- [ ] **Moteur 3D Vectoriel** : Finaliser la validation terrain et merger la branche `feature/b5-trajectory-3d` dans `main`. (Note : le moteur est prêt mais mis de côté pour l'instant).
- [ ] **Réticules ChairGun** : Améliorer la qualité du rendu visuel (actuellement jugé médiocre sur certains modèles).

### 🤖 Intelligence Artificielle (Ollama / Qwen)
- [ ] **Optimisation PCP Expert** : Créer un Modelfile spécifique pour Qwen3:14b avec les lois de la physique PCP.
- [ ] **Dataset d'entraînement** : Exporter les données ChairGun et Strelok pour alimenter le RAG de l'IA.
- [ ] **CORS Ollama** : Configurer `OLLAMA_ORIGINS` sur le serveur `192.168.1.2` pour permettre le test direct depuis le navigateur.

### 🛠️ Application & UI
- [ ] **Validation de masse** : Créer un outil de comparaison automatique entre le moteur AirBallistiK et les exports CSV de Strelok/ChairGun.

---
*Dernière mise à jour : 28 avril 2026*
