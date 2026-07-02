Write-Host "NovaOps Setup"

Write-Host "Installing Frontend"

cd apps/web

npm install

Write-Host "Installing Backend"

cd ../api

python -m venv .venv

.\.venv\Scripts\activate

pip install -r requirements.txt

Write-Host "Done"