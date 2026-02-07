$matchId = "match-1769088913489"
$url = "https://us-central1-axilam.cloudfunctions.net/auction"

Write-Host "Checking Auction State..." -ForegroundColor Magenta
Write-Host "Match ID: $matchId`n" -ForegroundColor Cyan

try {
    Write-Host "1. Fetching auction state..." -ForegroundColor Yellow
    $auctionResponse = Invoke-RestMethod -Uri "$url/matches/$matchId" -Method Get
    
    if ($auctionResponse.success) {
        $auction = $auctionResponse.data
        Write-Host "`n=== BACKEND AUCTION STATE ===" -ForegroundColor Green
        Write-Host "Current Player ID: $($auction.currentPlayerId)"
        Write-Host "Current Player Name: $($auction.currentPlayerName)"
        Write-Host "Current Bid: $($auction.currentBid)"
        Write-Host "Status: $($auction.status)"
    } else {
        Write-Host "Failed to fetch auction" -ForegroundColor Red
        exit
    }
    
    Write-Host "`n2. Fetching players..." -ForegroundColor Yellow
    $playersResponse = Invoke-RestMethod -Uri "$url/players?matchId=$matchId" -Method Get
    
    if ($playersResponse.success) {
        $players = $playersResponse.data
        Write-Host "Found $($players.Count) players`n" -ForegroundColor White
        
        $livePlayer = $players | Where-Object { $_.status -eq 'LIVE' }
        $currentPlayer = $players | Where-Object { $_.id -eq $auction.currentPlayerId }
        
        Write-Host "=== LIVE STATUS CHECK ===" -ForegroundColor Green
        if ($livePlayer) {
            Write-Host "LIVE Player: $($livePlayer.name) (ID: $($livePlayer.id))" -ForegroundColor Cyan
            Write-Host "  Current Bid: $($livePlayer.currentBid)"
        } else {
            Write-Host "No player with status=LIVE found!" -ForegroundColor Yellow
        }
        
        Write-Host "`n=== BACKEND'S CURRENT PLAYER ===" -ForegroundColor Green
        if ($currentPlayer) {
            Write-Host "Player: $($currentPlayer.name) (ID: $($currentPlayer.id))" -ForegroundColor Cyan
            Write-Host "  Current Bid: $($currentPlayer.currentBid)"
        } else {
            Write-Host "Backend currentPlayerId not found in players list!" -ForegroundColor Yellow
        }
        
        Write-Host "`n=== CONSISTENCY CHECK ===" -ForegroundColor Green
        if ($auction.currentPlayerId -and $currentPlayer -and $livePlayer) {
            if ($currentPlayer.id -eq $livePlayer.id) {
                Write-Host "✅ CONSISTENT" -ForegroundColor Green
            } else {
                Write-Host "❌ MISMATCH - Backend: $($currentPlayer.name) | Players: $($livePlayer.name)" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "Failed to fetch players" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}