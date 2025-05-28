# JobSender Pro - Application Flask

Une application web moderne pour l'envoi d'emails en masse avec interface intuitive et thème sombre.

## 🚀 Fonctionnalités

- **Chargement de fichiers** : Support Excel (.xlsx, .xls) et CSV
- **Mapping intelligent** : Association automatique des colonnes
- **Configuration SMTP** : Support Gmail, Outlook, Yahoo et serveurs personnalisés
- **Templates d'emails** : Personnalisation avec variables dynamiques et markdown
- **Pièces jointes** : Support de multiples formats (PDF, DOC, images)
- **Prévisualisation** : Aperçu avant envoi
- **Envoi flexible** : Test, sélectif ou massif (max 50 emails)
- **Statistiques** : Tableau de bord avec graphiques
- **Interface moderne** : Design glassmorphisme avec animations

## 📋 Prérequis

- Python 3.8+
- pip (gestionnaire de paquets Python)

## 🛠️ Installation

1. **Cloner ou télécharger le projet**
```bash
git clone <repository-url>
cd jobsender-pro
```

2. **Créer un environnement virtuel** (recommandé)
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

3. **Installer les dépendances**
```bash
pip install flask pandas openpyxl xlrd
```

4. **Créer la structure des dossiers**
```
jobsender-pro/
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── uploads/
└── README.md
```

## 🏃 Lancement de l'application

1. **Démarrer le serveur Flask**
```bash
python app.py
```

2. **Ouvrir dans le navigateur**
```
http://localhost:5000
```

## 📧 Configuration Email

### Gmail
1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application :
   - Compte Google → Sécurité → Mots de passe d'application
   - Sélectionner "Mail" et votre appareil
   - Utiliser le mot de passe généré (16 caractères)

### Outlook/Hotmail
1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application :
   - Compte Microsoft → Sécurité → Options de connexion avancées
   - Mots de passe d'application → Créer un nouveau mot de passe

### Yahoo
1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application :
   - Compte Yahoo → Sécurité du compte → Générer un mot de passe d'application

## 📊 Format des fichiers

### Colonnes recommandées
- **Email** : Adresses email des destinataires
- **Nom** : Nom du contact
- **Entreprise** : Nom de l'entreprise
- **Secteur** : Secteur d'activité (optionnel)

### Exemple CSV
```csv
Email,Nom,Entreprise,Secteur
john@example.com,John Doe,Example Corp,Technologie
jane@sample.org,Jane Smith,Sample Ltd,Finance
```

## ✉️ Variables de template

Utilisez ces variables dans vos emails :
- `{nom}` - Nom du contact
- `{entreprise}` - Nom de l'entreprise
- `{secteur}` - Secteur d'activité
- `{email}` - Email du destinataire

### Formatage Markdown
- **Gras** : `**texte**`
- *Italique* : `*texte*`
- ==Surligné== : `==texte==`

## 🔧 Résolution de problèmes

### Erreurs d'authentification
- Vérifiez que l'authentification à 2 facteurs est activée
- Utilisez un mot de passe d'application, pas votre mot de passe principal
- Gmail : Activez "Accès moins sécurisé" si nécessaire

### Emails non délivrés
- Respectez les limites d'envoi (max 50 par session)
- Évitez les mots-clés de spam
- Personnalisez vos messages
- Utilisez des adresses email valides

### Fichiers non supportés
- Formats supportés : .xlsx, .xls, .csv
- Encodage recommandé : UTF-8 pour les CSV
- Taille max des pièces jointes : 10MB

## 📈 Limites et bonnes pratiques

- **Limite d'envoi** : 50 emails par session
- **Délai entre envois** : 3 secondes (évite le spam)
- **Testez toujours** : Utilisez l'option "Test" avant l'envoi massif
- **Personnalisez** : Utilisez les variables pour personnaliser
- **Respectez la loi** : Conformez-vous au RGPD et aux lois anti-spam

## 🎯 Utilisation

1. **Chargez votre fichier** : Excel ou CSV avec les contacts
2. **Mappez les colonnes** : Associez les colonnes à email, nom, entreprise
3. **Configurez SMTP** : Renseignez vos identifiants email
4. **Créez votre template** : Rédigez votre message avec variables
5. **Prévisualisez** : Vérifiez le rendu pour une entreprise
6. **Envoyez** : Test puis envoi sélectif ou massif

## 🔒 Sécurité

- Les mots de passe sont stockés en session temporaire
- Aucune donnée n'est sauvegardée sur le serveur
- Utilisez HTTPS en production
- Ne partagez jamais vos mots de passe d'application

## 🐛 Support

En cas de problème :
1. Vérifiez les logs dans la console
2. Testez avec un seul email d'abord
3. Vérifiez votre configuration SMTP
4. Consultez la documentation de votre fournisseur email

## 🎉 Easter Eggs

- Animation de célébration à 10 emails envoyés
- Notifications interactives
- Animations de hover sur les boutons

---

**Version** : 1.0  
**Licence** : MIT  
**Auteur** : JobSender Pro Team