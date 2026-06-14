@echo off
chcp 65001 >nul
title Smart Reporting RDJ — Git & Deploy

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║       SMART REPORTING RDJ — Git + Deploy         ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: Vérifier que git est disponible
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Git n'est pas installé ou introuvable dans le PATH.
    pause
    exit /b 1
)

:: Aller dans le dossier du projet
cd /d "%~dp0"

:: Afficher les fichiers modifiés
echo Fichiers modifiés :
echo ──────────────────
git status --short
echo.

:: Demander le message de commit
set /p MSG="Message de commit : "
if "%MSG%"=="" (
    echo [ERREUR] Le message de commit ne peut pas être vide.
    pause
    exit /b 1
)

echo.
echo [1/3] Ajout des fichiers...
git add .

echo [2/3] Commit : %MSG%
git commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo [INFO] Rien à committer.
    goto DEPLOY_CHOICE
)

echo [3/3] Push vers GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [ERREUR] Le push a échoué. Vérifiez votre connexion ou vos droits GitHub.
    pause
    exit /b 1
)

echo.
echo ✔ Code envoyé sur GitHub avec succès.
echo   https://github.com/MMGTech243/smart-reporting-rdj

:DEPLOY_CHOICE
echo.
echo ══════════════════════════════════════════════════
set /p DEPLOY="Déployer aussi sur Firebase Hosting ? (o/n) : "
if /i "%DEPLOY%"=="o" goto FIREBASE
if /i "%DEPLOY%"=="oui" goto FIREBASE
goto END

:FIREBASE
echo.
echo [Firebase] Build + Deploy en cours...
call npm run deploy
if %errorlevel% neq 0 (
    echo [ERREUR] Le déploiement Firebase a échoué.
    pause
    exit /b 1
)
echo.
echo ✔ Application déployée sur Firebase Hosting.
echo   https://smart-reporting-rdj.web.app

:END
echo.
echo ══════════════════════════════════════════════════
echo   Opération terminée.
echo ══════════════════════════════════════════════════
echo.
pause
