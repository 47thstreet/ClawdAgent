import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsFromSources } from '@/lib/events-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // 'upcoming', 'past', 'all'
    const source = searchParams.get('source'); // 'posh', 'vibe', 'both'
    const featured = searchParams.get('featured'); // 'true', 'false'
    
    // Fetch events from all sources
    const events = await fetchEventsFromSources();
    
    // Filter events based on query parameters
    let filteredEvents = events;
    
    if (status && status !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.status === status);
    }
    
    if (source && source !== 'both') {
      filteredEvents = filteredEvents.filter(event => event.source === source);
    }
    
    if (featured) {
      filteredEvents = filteredEvents.filter(event => 
        featured === 'true' ? event.featured : !event.featured
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredEvents,
      count: filteredEvents.length,
      filters: { status, source, featured }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}