(() => {
  const initInfiniteScroll = () => {
    const recentPosts = document.getElementById('recent-posts')
    const postList = recentPosts?.querySelector('.recent-post-items')
    const pagination = recentPosts?.querySelector('#pagination')

    if (!recentPosts || !postList || !pagination || recentPosts.dataset.infiniteScrollReady) return

    const initialNextLink = pagination.querySelector('a.extend.next')
    if (!initialNextLink) return

    recentPosts.dataset.infiniteScrollReady = 'true'
    recentPosts.classList.add('infinite-scroll-enabled')

    const status = document.createElement('div')
    status.className = 'infinite-scroll-status'
    status.setAttribute('role', 'status')
    status.setAttribute('aria-live', 'polite')
    recentPosts.insertBefore(status, pagination)

    let nextUrl = new URL(initialNextLink.href, window.location.href).href
    let loading = false
    let finished = false

    const setStatus = (state, message) => {
      status.dataset.state = state
      status.replaceChildren(document.createTextNode(message))
    }

    const setRetry = () => {
      status.dataset.state = 'error'
      const button = document.createElement('button')
      button.className = 'infinite-scroll-retry'
      button.type = 'button'
      button.textContent = '加载失败，点击重试'
      button.addEventListener('click', loadNextPage, { once: true })
      status.replaceChildren(button)
    }

    const loadNextPage = async () => {
      if (loading || finished || !nextUrl) return

      loading = true
      setStatus('loading', '正在加载更多文章…')

      try {
        const response = await fetch(nextUrl, {
          headers: { 'X-Requested-With': 'infinite-scroll' }
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const html = await response.text()
        const nextDocument = new DOMParser().parseFromString(html, 'text/html')
        const nextItems = nextDocument.querySelectorAll('#recent-posts .recent-post-items > .recent-post-item')

        if (nextItems.length === 0) throw new Error('No posts found on the next page')

        const fragment = document.createDocumentFragment()
        nextItems.forEach(item => fragment.appendChild(document.importNode(item, true)))
        postList.appendChild(fragment)

        const nextLink = nextDocument.querySelector('#recent-posts #pagination a.extend.next')
        nextUrl = nextLink ? new URL(nextLink.href, nextUrl).href : ''
        window.lazyLoadInstance?.update?.()

        if (nextUrl) {
          setStatus('idle', '继续向下滚动加载更多')
        } else {
          finished = true
          observer.disconnect()
          setStatus('complete', '全部文章已加载')
        }
      } catch (error) {
        console.error('[infinite-scroll] Failed to load the next page:', error)
        setRetry()
      } finally {
        loading = false
      }
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextPage()
    }, { rootMargin: '800px 0px' })

    setStatus('idle', '继续向下滚动加载更多')
    observer.observe(status)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInfiniteScroll, { once: true })
  } else {
    initInfiniteScroll()
  }
})()
