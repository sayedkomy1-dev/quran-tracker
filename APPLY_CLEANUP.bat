@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title IMAM Academy - Safe Repository Cleanup

echo ============================================================
echo IMAM Academy - Safe Repository Cleanup Stage 1
echo ============================================================
echo.
if not exist "index.html" (
  echo [ERROR] index.html not found. Run this file from the project root.
  pause
  exit /b 1
)
if not exist "review\SAFE-DELETIONS.json" (
  echo [ERROR] Cleanup manifest is missing.
  pause
  exit /b 1
)
if not exist "OP-BETA12-HISTORICAL-SCREENSHOT-SOURCE-ARCHIVE.zip" (
  echo [ERROR] Historical archive is missing. Nothing was deleted.
  pause
  exit /b 1
)

call :verify_hash "OP-BETA12-HISTORICAL-SCREENSHOT-SOURCE-ARCHIVE.zip" "be6343fcd894f19d2ddf97a3696609d873b239efd3c1b7579bc08572d14a29c7"
if errorlevel 1 (
  echo [ERROR] Historical archive hash mismatch. Nothing was deleted.
  pause
  exit /b 1
)

echo This operation removes up to 58 verified historical duplicate files.
echo A file is removed only when its SHA-256 matches the reviewed manifest.
echo Modified or mismatched files are kept.
echo.
choice /C YN /M "Continue with cleanup"
if errorlevel 2 (
  echo Cleanup cancelled. No files were changed.
  pause
  exit /b 0
)

set /a REMOVED=0
set /a SKIPPED=0
set /a FAILED=0

echo.
echo [1/2] Removing archived historical screenshot source...
call :remove_if_hash "review\SAFE-DELETE-HISTORICAL-SNAPSHOTS.ps1" "79222e27696c1456452eb829e20f5f762e182eec67464d8ed4764c72d5ccdd58"
call :remove_if_hash "screenshots\.github\workflows\ci.yml" "6571fc6469dcd31d12a1d47f80a6579e8c85ad5229e4edb4a6d530de839df304"
call :remove_if_hash "screenshots\.gitignore" "c0d6688d56062002cad8ebf91503710424329ce4475818b2ceb6de049357eb56"
call :remove_if_hash "screenshots\.nojekyll" "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
call :remove_if_hash "screenshots\AUDIT-V10.md" "af0311e82c8a616bdb2e9fbc2832cbb3a24973c00ce9027819038146d5c7f9a5"
call :remove_if_hash "screenshots\CHANGELOG-v9.2.md" "d5c9a717fbd5f7289df44d5df613963b1023cbd50ffe3bec8cbb1b0ffd2952e7"
call :remove_if_hash "screenshots\CHANGELOG.md" "53b59d0f3680a9a65f7497d25cb4ff23e762e0c3e6f0d21070061fa33ca50797"
call :remove_if_hash "screenshots\CNAME" "d6dec4981f02f1927c152da17fd04826ceb7c204d3ccb01a96d8452fec448a49"
call :remove_if_hash "screenshots\DEPLOYMENT.md" "7d1d4b68b70f7a3b261759e6045da72caebe4537875b0b0447994f2b6d9f579a"
call :remove_if_hash "screenshots\HOTFIX-v9.2.1.md" "82d038f6af7c5d18cad6e091248c22cb62fdd4aa22190a74422fea924e1dd286"
call :remove_if_hash "screenshots\MUSHAF-SOURCES.md" "813215026f00f2ff0330ef511e8f04ebbb25dfc555a02104058797183a223648"
call :remove_if_hash "screenshots\PROMPT-V2-AUDITED.md" "4db85217216a208944eb87ceab597bd399448cdac6cf9172b99463224a182349"
call :remove_if_hash "screenshots\QA-REPORT-10.1.1.md" "1138ee7a3f139c4e6496b4b4dc1fa87b5d20e7773d3d6a8edaab14a29d93b57c"
call :remove_if_hash "screenshots\QA-REPORT-10.1.2.md" "3164deb8ecfc1900e0efba6e09ed3e2b7d0c9e67275812c9f038dc73d6543934"
call :remove_if_hash "screenshots\QA-REPORT-10.1.3.md" "a55d520d2ec020ecc5e8b646a33bba00a643d552f8c796823712e25e861b7522"
call :remove_if_hash "screenshots\QA-REPORT-10.1.4.md" "889e20754fe1c6a7599a2c8a1652deaaab2b6d4807da305091501e72fbfe20e0"
call :remove_if_hash "screenshots\QA-REPORT-v9.1.md" "cfe25a13f38ecaddb51e49bcd995f73e5691b8666b1f25c95c48065a75d94d1e"
call :remove_if_hash "screenshots\QA-REPORT-v9.2.2.md" "5507dd447e0c19441b587e5ac99dc8af18e142a429ead3f24099ce21527a9f56"
call :remove_if_hash "screenshots\QA-REPORT-v9.2.md" "9e534f65f20f9e350be9e8e862c5e2fdb5c64e43273b50f907d1d32d39c53c43"
call :remove_if_hash "screenshots\QA-RUNTIME-v10.1.json" "54c678845974e33a9cf37b689579a077f397d6ae1cbbf486f7badaa14f9d5f13"
call :remove_if_hash "screenshots\README.md" "fc1466dc04c3ae3cfc84df854b53ca48e970d191089a7911f15d03b1269e4361"
call :remove_if_hash "screenshots\RELEASE-10.0.0.md" "cf8657259dacc0e2743bc01a738d620c7461489b226198f83b9de0ef717d9aa0"
call :remove_if_hash "screenshots\RELEASE-10.1.0.md" "afd19db26fd6877d77d8455895c4f223f1b7940f2089fc756bb9deb721fdaabc"
call :remove_if_hash "screenshots\RELEASE-10.1.1.md" "62afe62e4ac6802a8968d8d9bcbee0c78a528ceef057b1690f96b3b49a990245"
call :remove_if_hash "screenshots\RELEASE-10.1.2.md" "26b10e7ab6b586c878503b8feda4ad081b4c98a83ee9934b9507d14ed9a2cac1"
call :remove_if_hash "screenshots\RELEASE-10.1.3.md" "85def67d6f5cef0b6ded09906232f828506cd437a351621575e9397b9df323e0"
call :remove_if_hash "screenshots\RELEASE-10.1.4.md" "3f5e41545f1d008740283bf08f2a3417196cec8696837233f686e3173f1f0242"
call :remove_if_hash "screenshots\RELEASE-10.1.5.md" "f8eaff021fc31660955ac0b1221cbdab6fa0cd5fd83e4681b7cf76f387bc9222"
call :remove_if_hash "screenshots\RELEASE-9.2.2.md" "fca41621fd27647f878d4bd278c8d94f8ba042728723382df56b801ea45e0be5"
call :remove_if_hash "screenshots\RUNTIME-AUDIT-V10.1.md" "6c6b35f8a0dae1d6983206dc9dfeb987343f49ef362a0af074386e01b3c0450e"
call :remove_if_hash "screenshots\SHA256SUMS.txt" "051b1e1b70d52dbff42ec0248bb53de444e2619463b9088af9efa19fd7d1ba73"
call :remove_if_hash "screenshots\V9-IMPLEMENTATION.md" "5048d9a44c256e1173fd91ef0c203d74c178e86d88d2241f7041f479df548cab"
call :remove_if_hash "screenshots\VERSION" "af36705d84c58cd49a52d30c7313c64b24fbf624d9feba90b3dfbe53326a6aa1"
call :remove_if_hash "screenshots\app.js" "a112921f5f09821f8112d128defbe4ae1793bbe3f7c6fbc6c11d8ccb6c2d12bf"
call :remove_if_hash "screenshots\auth.css" "6e776ec401af0177a444d8efacf970424f9f321420811eedde150c7743504581"
call :remove_if_hash "screenshots\auth.js" "2782615c587c162c2794457601e87d9363c1aaa4008098f670311817fc51cb7b"
call :remove_if_hash "screenshots\index.html" "493851b49daa33b672fa983bd42971808c98a1fe51e97af6eab6c1c2cc83a625"
call :remove_if_hash "screenshots\manifest.json" "7102aa1e0a4646a2dc59b90d33748291c56948e2de3f61c51708403f48e0b2c0"
call :remove_if_hash "screenshots\package.json" "7e65344a0eac24f8a1fe4c8638aee888837caeb6a97dfdafa2b609fedf713dc8"
call :remove_if_hash "screenshots\privacy.html" "9b81ecbf75c97875b9feee334b53a4566c1fe0afc36adfc7eeffc02ebe1b2908"
call :remove_if_hash "screenshots\sql\account-sync.sql" "27ac552080bc4a581eba62b141968aa69f4449423da2d24dd6c8552839e44e25"
call :remove_if_hash "screenshots\sql\auth-access.sql" "e15164781b1a51baeabeb9395b794149f19cecad03a7287b862bb411ace0eb9a"
call :remove_if_hash "screenshots\sql\supabase-setup.sql" "387295436c4208e820d3a1b952c06bb7b51db61fe6f8d3c96a36832759014a9e"
call :remove_if_hash "screenshots\sql\supabase-sync.sql" "5f4c5de555bf095e4c26978464bcffdfae6e31b00c6feb04adde596e5b55bbdc"
call :remove_if_hash "screenshots\styles.css" "a50773530f17035e3c35ef29146b087f690ae7b262d35b7c0869c2517077e164"
call :remove_if_hash "screenshots\sw.js" "22bc5ddd9758811e7c5376d5912e21b3ae5259478bda413725727dc56262e0e4"
call :remove_if_hash "screenshots\sync-core.js" "138c6dc17862bbd5c77269c75f69883c9f0ef9d9145d394683c040fd217b270a"
call :remove_if_hash "screenshots\terms.html" "ff76a1b6d54cfa51f3aafe2f6d250f71e15af3d0c6f966c9d0f3ecb0f0b06bfc"
call :remove_if_hash "screenshots\tests\static-check.js" "18afa1e3f3e0b80d55bba1063c3895866797fc6cd53f13e18e7d7eb057a6b55b"
call :remove_if_hash "screenshots\v10.css" "9e4e0c56c1de3627d1094e445da46f851d1b74143243d6088ef43b9abeaeb242"
call :remove_if_hash "screenshots\v10.js" "1e1708045d16d866b93f7f5157cfd6e70df903d80f828b1b7c4c519ac5736733"
call :remove_if_hash "screenshots\v8.js" "8e34cf6189584e76df037727c03057446bc27463205571515ab1d2a11cca2fa4"
call :remove_if_hash "screenshots\v9.css" "eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef"
call :remove_if_hash "screenshots\v9.js" "dbfa9dc4a4ba982ff100b6fb9bac20fd15693302acf9e656cf276f1b9afdd186"

echo.
echo [2/2] Removing root-level duplicate CSS snapshots...
call :remove_if_hash "styles.css" "ca9ea955d72108b3a8cc7d2c9ec2c2e5486538cbeaaf05572c5ae47a6970822e"
call :remove_if_hash "v10.css" "e4d356ac5b94834eba94661c023afd6665a438edb64953aaf42240d2c09b78df"
call :remove_if_hash "v11.css" "27d01ded6c327acd95c4efb1d4f84297345911c2236cd7d78bd512847396640b"
call :remove_if_hash "v9.css" "eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef"

echo.
echo Removing empty folders only...
for /f "delims=" %%D in ('dir /ad /b /s "screenshots" 2^>nul ^| sort /r') do rd "%%D" 2>nul

echo.
echo ============================================================
echo Cleanup result
echo Removed: !REMOVED!
echo Skipped (missing or hash mismatch): !SKIPPED!
echo Failed: !FAILED!
echo ============================================================
echo.
if !FAILED! GTR 0 (
  echo [WARNING] Some files could not be removed. Review the messages above.
) else (
  echo [OK] Safe cleanup finished. Reference images were not deleted.
)
echo.
echo Next: open GitHub Desktop and review Changes before Commit.
pause
exit /b 0

:verify_hash
set "TARGET=%~1"
set "EXPECTED=%~2"
set "ACTUAL="
for /f "tokens=* delims=" %%H in ('certutil -hashfile "%TARGET%" SHA256 2^>nul ^| findstr /r /i "^[0-9a-f][0-9a-f]*$"') do set "ACTUAL=%%H"
if /i not "!ACTUAL!"=="!EXPECTED!" exit /b 1
exit /b 0

:remove_if_hash
set "TARGET=%~1"
set "EXPECTED=%~2"
if not exist "%TARGET%" (
  set /a SKIPPED+=1
  exit /b 0
)
set "ACTUAL="
for /f "tokens=* delims=" %%H in ('certutil -hashfile "%TARGET%" SHA256 2^>nul ^| findstr /r /i "^[0-9a-f][0-9a-f]*$"') do set "ACTUAL=%%H"
if /i not "!ACTUAL!"=="!EXPECTED!" (
  echo [KEEP] Hash differs: %~1
  set /a SKIPPED+=1
  exit /b 0
)
del /f /q "%TARGET%" >nul 2>&1
if exist "%TARGET%" (
  echo [FAIL] Could not remove: %~1
  set /a FAILED+=1
) else (
  echo [REMOVED] %~1
  set /a REMOVED+=1
)
exit /b 0
